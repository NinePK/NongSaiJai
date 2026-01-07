import { NextRequest, NextResponse } from "next/server";
import { supabasePublicServer } from "../../../../../../lib/supabasePublicServer";

export async function GET(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10) || 200, 500);

    const sb = supabasePublicServer();

    const { data, error } = await sb
      .from("ai_chat_messages")
      .select("id, session_id, sender, message_text, timestamp")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ items: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
