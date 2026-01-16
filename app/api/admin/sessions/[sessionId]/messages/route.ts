// app/api/admin/sessions/[sessionId]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await ctx.params;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "200", 10) || 200,
      500
    );

    const { rows } = await pool.query(
      `
      select
        id,
        session_id,
        sender,
        message_text,
        timestamp
      from public.ai_chat_messages
      where session_id = $1
      order by timestamp asc
      limit $2
      `,
      [sessionId, limit]
    );

    return NextResponse.json({ items: rows ?? [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
