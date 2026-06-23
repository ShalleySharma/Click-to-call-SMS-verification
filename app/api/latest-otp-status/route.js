import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db.js";

// Returns latest verification status per mobile number.
// Output: { ok: true, rows: [{ mobile, status, created_at }] }
export async function GET() {
  try {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      // Latest row per mobile, based on created_at then id.
      // MySQL 8+ supports window functions.
      const [rows] = await conn.execute(
        `SELECT mobile, status, created_at
         FROM (
           SELECT mobile, status, created_at,
                  ROW_NUMBER() OVER (PARTITION BY mobile ORDER BY created_at DESC, id DESC) AS rn
           FROM otp_verifications
         ) t
         WHERE rn = 1
         ORDER BY created_at DESC, mobile DESC
         LIMIT 50`
      );

      return NextResponse.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load latest otp status per phone.",
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}

