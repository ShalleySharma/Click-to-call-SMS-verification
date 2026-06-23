import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db.js";

function isDigits10(s) {
  return typeof s === "string" && /^\d{10}$/.test(s);
}

function isDigits6(s) {
  return typeof s === "string" && /^\d{6}$/.test(s);
}

const OTP_TTL_MS = 5 * 60 * 1000;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const mobile = body?.mobile;
    const otp = body?.otp;

    if (!isDigits10(mobile) || !isDigits6(otp)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid input. Mobile must be 10 digits and OTP must be 6 digits.",
        },
        { status: 400 }
      );
    }

    const pool = getPool();

    const conn = await pool.getConnection();
    let latest;
    try {
      const [rows] = await conn.execute(
        `SELECT id, otp, status, created_at, verified_at
         FROM otp_verifications
         WHERE mobile = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [mobile]
      );
      latest = rows?.[0] || null;
    } finally {
      conn.release();
    }

    if (!latest) {
      return NextResponse.json(
        { ok: false, error: "❌ Invalid OTP" },
        { status: 400 }
      );
    }

    const createdAt = latest.created_at instanceof Date
      ? latest.created_at
      : new Date(latest.created_at);

    const ageMs = Date.now() - createdAt.getTime();
    const isExpired = Number.isNaN(ageMs) ? true : ageMs > OTP_TTL_MS;

    if (isExpired) {
      // Mark as not_verified
      const conn2 = await pool.getConnection();
      try {
        await conn2.execute(
          `INSERT INTO otp_verifications (mobile, otp, status, created_at, verified_at)
           VALUES (?, ?, 'not_verified', ?, NULL)`,
          [mobile, otp, new Date()]
        );
      } finally {
        conn2.release();
      }

      return NextResponse.json(
        { ok: false, error: "❌ Invalid OTP" },
        { status: 400 }
      );
    }

    const isMatch = String(latest.otp) === String(otp);

    if (!isMatch) {
      const conn2 = await pool.getConnection();
      try {
        await conn2.execute(
          `INSERT INTO otp_verifications (mobile, otp, status, created_at, verified_at)
           VALUES (?, ?, 'not_verified', ?, NULL)`,
          [mobile, otp, new Date()]
        );
      } finally {
        conn2.release();
      }

      return NextResponse.json(
        { ok: false, error: "❌ Invalid OTP" },
        { status: 400 }
      );
    }

    // Update status to verified
    const conn3 = await pool.getConnection();
    try {
      await conn3.execute(
        `UPDATE otp_verifications
         SET status = 'verified', verified_at = ?
         WHERE id = ?`,
        [new Date(), latest.id]
      );
    } finally {
      conn3.release();
    }

    return NextResponse.json({ ok: true, message: "✅ User Verified Successfully" });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unexpected server error. Please try again." },
      { status: 500 }
    );
  }
}

