// app/api/admin/sessions/[sessionId]/override/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const ALLOWED_STATUS = new Set(["ISSUE", "RISK", "CONCERN", "NON_RISK"]);
const ALLOWED_CAT = new Set(["People", "Process", "Quality", "Scope", "Financial"]);

const DEMO_OVERRIDDEN_BY = "00000000-0000-0000-0000-000000000001";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  console.log("====== [OVERRIDE ROUTE HIT] ======");
  const client = await pool.connect();

  try {
    const { sessionId } = await ctx.params;
    console.log("[override] sessionId:", sessionId);

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId param in route" }, { status: 400 });
    }

    let status: string | null = null;

    // ✅ Option B: primary_category lives in ai_risk_assessments
    let primary_category: string | null = null;

    let override_notes: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    console.log("[override] content-type:", contentType);

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      console.log("[override] JSON body:", body);

      // รองรับทั้งชื่อเดิม + ใหม่
      status = body?.override_status ?? body?.status ?? null;

      // ✅ Option B field (preferred)
      primary_category = body?.primary_category ?? null;

      // backward compat: บาง modal ยังส่งชื่อเดิม
      if (!primary_category) primary_category = body?.override_primary_category ?? null;

      override_notes = body?.override_notes ?? null;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      status = (form.get("status") as string | null) ?? null;

      // optional in form mode (เผื่ออนาคต)
      primary_category = (form.get("primary_category") as string | null) ?? null;

      override_notes = (form.get("override_notes") as string | null) ?? null;
    } else {
      // fallback
      const form = await req.formData().catch(() => null);
      status = ((form?.get("status") as string | null) ?? null) as any;
      primary_category = ((form?.get("primary_category") as string | null) ?? null) as any;
      override_notes = ((form?.get("override_notes") as string | null) ?? null) as any;
    }

    console.log("[override] parsed status:", status);
    console.log("[override] parsed primary_category:", primary_category);
    console.log("[override] parsed notes length:", override_notes?.length ?? 0);

    if (!status || !ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: "Invalid override status" }, { status: 400 });
    }

    if (primary_category && !ALLOWED_CAT.has(primary_category)) {
      return NextResponse.json({ error: "Invalid primary category" }, { status: 400 });
    }

    await client.query("BEGIN");

    // 1) ✅ upsert override record (เก็บ status + notes เป็นหลัก)
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

    // 2) ✅ Option B: บันทึก primary_category ลง ai_risk_assessments
    //    - ถ้าแถวไม่มี: insert ได้ เพราะ ai_title/ai_summary มี default ''
    //    - ถ้ามี: update เฉพาะ primary_category + updated_at
    if (primary_category) {
      await client.query(
        `
        insert into public.ai_risk_assessments (session_id, classification_status, primary_category)
        values ($1, (select classification_status from public.ai_risk_assessments where session_id = $1), $2)
        on conflict (session_id)
        do update set
          primary_category = excluded.primary_category,
          updated_at = now()
        `,
        [sessionId, primary_category]
      );
    }

    await client.query("COMMIT");

    const dbg = await client.query(`select current_database() as db, current_schema() as schema`);

    console.log("[override] ✅ override result:", upsertOverride.rows);
    console.log("[override] 🔎 connected DB:", dbg.rows[0]);
    console.log("====== [OVERRIDE ROUTE DONE] ======");

    return NextResponse.json({
      ok: true,
      row: upsertOverride.rows?.[0] ?? null,
      db: dbg.rows?.[0] ?? null,
    });
  } catch (e: any) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[override] 💥 ERROR:", e);
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 });
  } finally {
    client.release();
  }
}
