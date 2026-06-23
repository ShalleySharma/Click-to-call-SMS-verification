import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db.js";

export async function GET() {
  try {
    const pool = getPool();

    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.execute(
        `SELECT status, COUNT(*) AS count
         FROM otp_verifications
         GROUP BY status`
      );

      const out = {
        verified: 0,
        pending: 0,
        not_verified: 0,
      };

      for (const r of rows || []) {
        if (r?.status in out) out[r.status] = Number(r.count) || 0;
      }

      return NextResponse.json({ ok: true, stats: out });
    } finally {
      conn.release();
    }
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load otp verification stats.",
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}

