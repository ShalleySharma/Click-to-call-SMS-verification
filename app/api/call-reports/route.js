// import { NextResponse } from "next/server";
// import { getPool } from "../../../lib/db.js";

// function isDigits(s, minLen, maxLen) {
//   return typeof s === "string" && s.length >= minLen && s.length <= maxLen && /^\d+$/.test(s);
// }

// export async function GET(req) {
//   const { searchParams } = new URL(req.url);

//   // filters
//   const campaignId = searchParams.get("campaignId");
//   const fromNumber = searchParams.get("fromNumber");
//   const toNumber = searchParams.get("toNumber");
//   const status = searchParams.get("status"); // All | Answered | Missed | Busy | Failed

//   // pagination
//   const page = Math.max(1, Number(searchParams.get("page") || "1"));
//   const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "10")));
//   const offset = (page - 1) * pageSize;

//   const pool = getPool();
//   const conn = await pool.getConnection();

//   try {
//     const where = [];
//     const params = [];

//     if (campaignId && isDigits(campaignId, 1, 20)) {
//       where.push("campaign_id = ?");
//       params.push(Number(campaignId));
//     }

//     if (fromNumber && isDigits(fromNumber, 1, 20)) {
//       where.push("from_number = ?");
//       params.push(fromNumber);
//     }

//     if (toNumber && isDigits(toNumber, 1, 20)) {
//       where.push("to_number = ?");
//       params.push(toNumber);
//     }

//     // Status filter maps to from_status using string matching.
//     // Backend stores the raw from_status from callback.
//     if (status && status !== "All") {
//       where.push("from_status = ?");
//       params.push(status);
//     }

//     const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

//     const countSql = `SELECT COUNT(*) AS total FROM call_reports ${whereSql}`;
//     const [countRows] = await conn.execute(countSql, params);
//     const total = Number(countRows?.[0]?.total || 0);

//     const sql = `SELECT
//         id,
//         campaign_id,
//         from_number,
//         to_number,
//         call_time,
//         from_status,
//         answer_time,
//         recording_url
//       FROM call_reports
//       ${whereSql}
//       ORDER BY call_time DESC, id DESC
//       LIMIT ? OFFSET ?`;

//     const rowsParams = [...params, pageSize, offset];
//     const [rows] = await conn.execute(sql, rowsParams);

//     return NextResponse.json({
//       ok: true,
//       page,
//       pageSize,
//       total,
//       rows,
//     });
//   } finally {
//     conn.release();
//   }
// }

import { NextResponse } from "next/server";

// CTC report persistence: NO MySQL.
// This endpoint exists only for the admin UI page (/call-reports) which previously used SQL.
// Return empty results so your console doesn't spam SQL.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));

  return NextResponse.json({
    ok: true,
    page,
    pageSize,
    total: 0,
    rows: [],
  });
}

