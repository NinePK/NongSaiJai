import { NextRequest, NextResponse } from "next/server";
import { supabasePublicServer } from "../../../../lib/supabasePublicServer"


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "10", 10) || 10,
      50
    );

    const sb = supabasePublicServer();

    const { data, error } = await sb
      .from("v_ai_session_admin")
      .select(
        `
        session_id,
        proj_code,
        effective_status,
        effective_primary_category,
        ai_status,
        ai_primary_category,
        has_override,
        overridden_at,
        last_message_at,
        last_message_snippet
      `
      )
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (err: any) {
    console.error("API crash:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
