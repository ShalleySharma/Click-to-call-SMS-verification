import { NextResponse } from "next/server";

// Debug-only broker endpoint (optional). Not used by UI.
export async function POST() {
  return NextResponse.json({ ok: true });
}

