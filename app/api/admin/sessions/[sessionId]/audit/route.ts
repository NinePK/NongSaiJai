import { NextRequest, NextResponse } from "next/server";
import { supabasePublicServer } from "../../../../../../lib/supabasePublicServer";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;

    const sb = supabasePublicServer();

    const { data, error } = await sb
      .from("ai_admin_audit_logs")
      .select("id, session_id, action, before, after, reason, actor_user_id, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ items: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
