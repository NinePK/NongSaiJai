import { NextRequest, NextResponse } from "next/server";
import { supabasePublicServer } from "@/lib/supabasePublicServer";

// ✅ เพิ่ม ISSUE
const ALLOWED_STATUS = new Set(["ISSUE", "RISK", "CONCERN", "NON_RISK"]);
const ALLOWED_CAT = new Set(["People", "Process", "Quality", "Scope", "Financial"]);

// เดโม: ใช้ uuid คงที่ให้ผ่าน NOT NULL (เปลี่ยนได้ภายหลัง)
const DEMO_OVERRIDDEN_BY = "00000000-0000-0000-0000-000000000001";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await ctx.params;

    const form = await req.formData();
    const status = String(form.get("status") ?? "").trim();

    const primaryCategoryRaw = form.get("primary_category");
    const notesRaw = form.get("notes");

    const override_primary_category =
      primaryCategoryRaw == null || String(primaryCategoryRaw).trim() === ""
        ? null
        : String(primaryCategoryRaw).trim();

    const override_notes =
      notesRaw == null || String(notesRaw).trim() === ""
        ? null
        : String(notesRaw).trim();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId missing" }, { status: 400 });
    }
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json(
        { error: "invalid status", allowed: Array.from(ALLOWED_STATUS) },
        { status: 400 }
      );
    }
    if (override_primary_category && !ALLOWED_CAT.has(override_primary_category)) {
      return NextResponse.json(
        { error: "invalid primary_category", allowed: Array.from(ALLOWED_CAT) },
        { status: 400 }
      );
    }

    const sb = supabasePublicServer();

    const { error } = await sb
      .from("ai_admin_overrides")
      .upsert(
        {
          session_id: sessionId,
          override_status: status,
          override_primary_category,
          override_notes,
          overridden_by: DEMO_OVERRIDDEN_BY,
          overridden_at: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: "session_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const origin = req.nextUrl.origin;
    return NextResponse.redirect(`${origin}/admin/sessions/${sessionId}`, { status: 303 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 });
  }
}
