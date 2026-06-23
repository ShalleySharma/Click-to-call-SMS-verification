import { NextResponse } from "next/server";

// In your CTC flow, call reports are not persisted in MySQL.
// Keep this endpoint to satisfy the UI, but return an empty list.
export async function GET() {
  return NextResponse.json({ ok: true, rows: [] });
}


