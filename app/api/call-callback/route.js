
// import { NextResponse } from "next/server";
// import { getPool } from "../../../lib/db.js";

// export async function POST(req) {
//   let conn;

//   try {
//     const payload = await req.json();

//     console.log("=================================");
//     console.log("CALLBACK RECEIVED");
//     console.log(JSON.stringify(payload, null, 2));
//     console.log("=================================");

//     const pool = getPool();
//     conn = await pool.getConnection();

//     console.log("DB CONNECTED");

//     const [result] = await conn.execute(
//       `
//       INSERT INTO call_reports (
//         campaign_id,
//         from_number,
//         to_number,
//         call_time,
//         from_status,
//         answer_time,
//         recording_url,
//         raw_payload
//       )
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
//         payload.campaignId || null,
//         payload.from_number || null,
//         payload.to_number || null,
//         new Date(),
//         payload.status || null,
//         payload.answer_time || null,
//         payload.recording_url || null,
//         JSON.stringify(payload),
//       ]
//     );

//     console.log("INSERT RESULT:");
//     console.log(result);

//     const [rows] = await conn.execute(
//       "SELECT * FROM call_reports ORDER BY id DESC LIMIT 5"
//     );

   
//     console.log("ROWS FROM DB:", rows);
// console.log("TOTAL:", total);

//     return NextResponse.json({
//       success: true,
//       insertResult: result,
//       latestRows: rows,
//     });
//   } catch (error) {
//     console.error("CALLBACK ERROR:");
//     console.error(error);

//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message,
//       },
//       { status: 500 }
//     );
//   } finally {
//     if (conn) {
//       conn.release();
//     }
//   }
// }

import { NextResponse } from "next/server";

// Must match the same global broker used in app/api/call-callback-stream/route.js
const broker =
  globalThis.__ctc_broker ||
  (globalThis.__ctc_broker = {
    items: new Map(),
    listeners: new Map(),
  });


function safeString(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

export async function POST(req) {
  try {
    console.log("CALLBACK ROUTE HIT");
    console.log("CALLBACK METHOD:", req.method);
    console.log(
      "CALLBACK CONTENT-TYPE:",
      req.headers.get("content-type")
    );

    const payload = await req.json();
    console.log("CALLBACK RECEIVED (no DB):", JSON.stringify(payload, null, 2));


    // broker reference
    const brokerRef = broker;

    // Use trackingRef for correlation. Cloudshope may echo it as:
    // - tracking_ref (common)
    // - trackingRef
    const trackingRef =
      safeString(payload?.tracking_ref) || safeString(payload?.trackingRef) || null;

    if (!trackingRef) {
      // If the provider doesn't echo trackingRef, we can’t correlate to the waiting browser.
      // Still acknowledge receipt.
      return NextResponse.json({ ok: true, warning: "Missing tracking_ref in callback payload" });
    }

    // Mark as ready and store payload in broker.
    broker.items.set(trackingRef, {
      status: "ready",
      payload,
      createdAt: Date.now(),
    });

    // Notify any SSE listeners.
    const listeners = broker.listeners.get(trackingRef);
    if (listeners && listeners.size) {
      for (const w of Array.from(listeners)) {
        try {
          w.send("ready", payload);
          // close after sending
          w.close();
        } catch {
          // ignore
        }
      }
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch (error) {
    console.error("CALLBACK ERROR (no DB):", error);
    return NextResponse.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}
