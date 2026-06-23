import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db.js";

function isDigits10(s) {
  return typeof s === "string" && /^\d{10}$/.test(s);
}

function genOtp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getSmsUrl(mobile, otp) {
  // Provider URL from requirements.
  // NOTE: call this from backend only.
  return `https://panelv3.cloudshope.com/api/send_sms_p?to=${encodeURIComponent(
    mobile
  )}|${encodeURIComponent(otp)}&template_id=6337&type=Trans&sms_type=smart&var_header=var`;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const mobile = body?.mobile;

    // Helpful diagnostics (no secrets)
    const required = ["DB_HOST", "DB_USER", "DB_NAME"];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "Database is not configured in runtime environment variables.",
          missing,
        },
        { status: 500 }
      );
    }


    if (!isDigits10(mobile)) {
      return NextResponse.json(
        { ok: false, error: "Invalid mobile. Exactly 10 digits required." },
        { status: 400 }
      );
    }

    const otp = genOtp6();

    const pool = getPool();
    const createdAt = new Date();

    // Save OTP (pending)
    // We keep each attempt as a new row; verification uses the latest created_at.
    const conn = await pool.getConnection();
    try {
      await conn.execute(
        `INSERT INTO otp_verifications (mobile, otp, status, created_at, verified_at)
         VALUES (?, ?, 'pending', ?, NULL)`,
        [mobile, otp, createdAt]
      );
    } finally {
      conn.release();
    }

    // Call SMS provider
    // We don't expose provider logic to frontend.
    const smsUrl = getSmsUrl(mobile, otp);
    console.log("[send-otp] smsUrl:", smsUrl);

    const bearer = process.env.SMS_BEARER_TOKEN;
    console.log("[send-otp] has SMS_BEARER_TOKEN:", !!bearer);

    // Some providers return 405 for GET; try POST if so.
    let smsRes = await fetch(smsUrl, {
      method: "POST",
      headers: bearer
        ? {
            Authorization: `Bearer ${bearer}`,
            Accept: "application/json",
          }
        : { Accept: "application/json" },
    }).catch(() => null);

    if (!smsRes) {
      return NextResponse.json(
        { ok: false, error: "SMS provider request failed.", details: "Network error" },
        { status: 502 }
      );
    }

    // If POST is rejected, fall back to GET
    if (smsRes.status === 405) {
      smsRes = await fetch(smsUrl, {
        method: "GET",
        headers: bearer
          ? {
              Authorization: `Bearer ${bearer}`,
              Accept: "application/json",
            }
          : { Accept: "application/json" },
      });
    }


    const smsText = await smsRes.text().catch(() => "");
    console.log("[send-otp] smsRes status:", smsRes.status);
    console.log("[send-otp] smsText:", smsText?.slice?.(0, 400));


    if (!smsRes.ok) {
      // Keep DB record but inform client.
      return NextResponse.json(
        {
          ok: false,
          error: "SMS provider request failed.",
          details: smsText ? smsText.slice(0, 500) : undefined,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, mobile });
  } catch (err) {
    // Return the error message for easier debugging (no secrets)
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error. Please try again.", message },
      { status: 500 }
    );
  }
}

