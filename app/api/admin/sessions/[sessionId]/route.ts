import { NextRequest, NextResponse } from "next/server";
import { supabasePublicServer } from "../../../../../lib/supabasePublicServer";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params;

    const sb = supabasePublicServer();

    const { data, error } = await sb
      .from("v_ai_session_admin")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ session: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
