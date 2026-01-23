import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const ALLOWED_STATUS = new Set(["ISSUE", "RISK", "CONCERN", "NON_RISK"]);
const ALLOWED_CAT = new Set(["People", "Process", "Quality", "Scope", "Financial"]);

const DEMO_OVERRIDDEN_BY = "00000000-0000-0000-0000-000000000001";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  console.log("====== [OVERRIDE ROUTE HIT] ======");

  try {
    const { sessionId } = await ctx.params;
    console.log("[override] sessionId:", sessionId);

    if (!sessionId) {
      console.log("[override] ❌ sessionId is missing");
      return NextResponse.json(
        { error: "Missing sessionId param in route" },
        { status: 400 }
      );
    }

    let status: string | null = null;
    let primary_category: string | null = null; // ✅ Option B: field เดียว
    let override_notes: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    console.log("[override] content-type:", contentType);

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      console.log("[override] JSON body:", body);

      status = body?.override_status ?? null;
      primary_category = body?.primary_category ?? null; // ✅ เปลี่ยนชื่อ field
      override_notes = body?.override_notes ?? null;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      status = (form.get("status") as string | null) ?? null;
      console.log("[override] FORM status:", status);
      // quick override ไม่มี primary_category / notes
    } else {
      console.log("[override] ⚠️ unknown content-type, trying formData()");
      const form = await req.formData().catch(() => null);
      status = (form?.get("status") as string | null) ?? null;
    }

    console.log("[override] parsed status:", status);
    console.log("[override] parsed primary_category:", primary_category);
    console.log("[override] parsed notes length:", override_notes?.length ?? 0);

    if (!status || !ALLOWED_STATUS.has(status)) {
      console.log("[override] ❌ invalid status");
      return NextResponse.json({ error: "Invalid override status" }, { status: 400 });
    }

    if (primary_category && !ALLOWED_CAT.has(primary_category)) {
      console.log("[override] ❌ invalid primary category");
      return NextResponse.json({ error: "Invalid primary category" }, { status: 400 });
    }

    console.log("[override] ⏳ running DB transaction (overrides + assessments)...");

    const client = await pool.connect();
    try {
      await client.query("begin");

      // 1) Upsert admin overrides (ไม่มี override_primary_category แล้ว)
      const upsertOverride = await client.query(
        `
        insert into public.ai_admin_overrides (
          session_id,
          override_status,
          override_notes,
          overridden_by,
          overridden_at,
          is_active
        )
        values ($1, $2, $3, $4, now(), true)
        on conflict (session_id)
        do update set
          override_status = excluded.override_status,
          override_notes = excluded.override_notes,
          overridden_by = excluded.overridden_by,
          overridden_at = now(),
          is_active = true
        returning session_id, override_status, overridden_at
        `,
        [sessionId, status, override_notes, DEMO_OVERRIDDEN_BY]
      );

     const upsertAssessment = await client.query(
  `
  insert into public.ai_risk_assessments (
    session_id,
    classification_status,
    primary_category,
    ai_summary,
    risk_scores,
    ai_title
  )
  values ($1, $2, $3, ''::text, '{}'::jsonb, ''::text)
  on conflict (session_id)
  do update set
    classification_status = excluded.classification_status,
    primary_category = coalesce(
      excluded.primary_category,
      public.ai_risk_assessments.primary_category
    ),
    updated_at = now()
  returning session_id, classification_status, primary_category, updated_at
  `,
  [sessionId, status, primary_category]
);

      await client.query("commit");

      console.log("[override] ✅ override upsert:", upsertOverride.rows?.[0]);
      console.log("[override] ✅ assessment upsert:", upsertAssessment.rows?.[0]);

      const dbg = await client.query(`select current_database() as db, current_schema() as schema`);
      console.log("[override] 🔎 connected DB:", dbg.rows[0]);

      console.log("====== [OVERRIDE ROUTE DONE] ======");

      return NextResponse.json({
        ok: true,
        override: upsertOverride.rows?.[0] ?? null,
        assessment: upsertAssessment.rows?.[0] ?? null,
        db: dbg.rows?.[0] ?? null,
      });
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("[override] 💥 ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 });
  }
}
