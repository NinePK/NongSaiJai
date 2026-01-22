import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    const result = await pool.query(
      `
      update public.ai_chat_sessions
      set is_admin_opened = true
      where id = $1::uuid
        and is_admin_opened = false
      `,
      [sessionId]
    );
    const changed = (result.rowCount ?? 0) > 0;
    return NextResponse.json({ ok: true, changed });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
