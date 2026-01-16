// app/api/admin/sessions/[sessionId]/audit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await ctx.params;

    const { rows } = await pool.query(
      `
      select
        id,
        session_id,
        action,
        before,
        after,
        reason,
        actor_user_id,
        created_at
      from public.ai_admin_audit_logs
      where session_id = $1
      order by created_at desc
      `,
      [sessionId]
    );

    return NextResponse.json({ items: rows ?? [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
