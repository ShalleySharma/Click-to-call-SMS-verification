import { NextResponse } from "next/server";

const URL = process.env.CLICK_TO_CALL_URL;
const TOKEN = process.env.CLICK_TO_CALL_TOKEN;
const CLI_NUMBER = process.env.CLI_NUMBER;

function isDigits10(s) {
  return typeof s === "string" && /^\d{10}$/.test(s);
}

function getCallbackUrl(req) {
  if (process.env.CALLBACK_URL) {
    return process.env.CALLBACK_URL;
  }

  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0];
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const requestUrl = new URL(req.url);
  const protocol = forwardedProto || requestUrl.protocol.replace(":", "") || "http";

  if (!forwardedHost) {
    return null;
  }

  return `${protocol}://${forwardedHost}/api/call-callback`;
}

export async function POST(req) {
  try {
    // Secure: secrets must never reach the client.
    if (!URL || !TOKEN || !CLI_NUMBER) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server is not configured. Please contact support (missing environment variables).",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const from_number = body?.from_number;
    const to_number = body?.to_number;
    const tracking_ref = body?.tracking_ref;

    if (!isDigits10(from_number) || !isDigits10(to_number)) {
      return NextResponse.json(
        { ok: false, error: "Invalid input. Numbers must be exactly 10 digits." },
        { status: 400 }
      );
    }

    const callbackUrl = getCallbackUrl(req);

console.log("CALLBACK URL:", callbackUrl);
console.log("CALL REQUEST:", {
  from_number,
  to_number,
  cli_number: CLI_NUMBER,
});
    if (!callbackUrl) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server is not configured. CALLBACK_URL is missing and could not be inferred from the request.",
        },
        { status: 500 }
      );
    }

    // Forward to external service.
    const externalRes = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        from_number,
        to_number,
        cli_number: CLI_NUMBER,
        callback_url: callbackUrl,
        callback_method: "POST",
        // pass tracking reference to the provider so it can echo it back in callback payload
        tracking_ref: tracking_ref || undefined,
      }),
    });


    const text = await externalRes.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!externalRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Click-to-call provider returned an error.",
          details: data,
        },
        { status: externalRes.status || 502 }
      );
    }

    return NextResponse.json({ ok: true, data, trackingRef: tracking_ref || null });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error. Please try again.",
      },
      { status: 500 }
    );
  }
}


