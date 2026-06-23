import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db.js";

function safeString(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

// Fetch the call report for a specific callback tracking reference.
// Note: this implementation is DB-based (it searches raw_payload in call_reports)
// but it is correlated purely via the callback trackingRef stored in browser cache.
//
// Query: /api/call-callback-fetch?trackingRef=...
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const trackingRef = safeString(searchParams.get("trackingRef"));

  if (!trackingRef) {
    return NextResponse.json({ ok: false, error: "trackingRef is required" }, { status: 400 });
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    const like = `%${trackingRef}%`;

    const [rows] = await conn.execute(
      `SELECT
        id,
        campaign_id,
        from_number,
        to_number,
        call_time,
        from_status,
        answer_time,
        recording_url,
        raw_payload
       FROM call_reports
       WHERE CAST(raw_payload AS CHAR) LIKE ?
       ORDER BY call_time DESC, id DESC
       LIMIT 1`,
      [like]
    );

    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    return NextResponse.json({ ok: true, row });
  } finally {
    conn.release();
  }
}

