// app/api/mpsmart/risk-logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

type Payload = {
  session_id: string;

  project_code: string;

  risk_title: string;
  risk_description?: string | null;
  impact_description?: string | null;

  risk_owner_id: number;
  registered_by_id: number;

  workstream?: string | null;
  migration_strategy?: string | null;

  target_closure_date: string; // ISO string
  open_date: string; // ISO string
  closed_date?: string | null;

  remark?: string | null;

  // ✅ ส่งมาเป็น code 1..10
  risk_category_code: number;

  likelihood_level_id: number; // 1..5
  impact_level_id: number; // 1..5

  status_id: number;
  registered_at: string; // ISO string

  // จะถูกบังคับเป็น risk_teams
  risk_owner_from_table?: string;
  registered_by_from_table?: string;

  risk_owner_user_code?: string | null;
  registered_by_user_code?: string | null;

  notify_enabled?: boolean;
  is_escalate_to_pmo?: boolean;
  is_escalate_to_management?: boolean;

  from_app?: string;
};

function isISODate(s: string) {
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Payload | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    // ✅ Force from_table ตาม requirement ใหม่
    body.risk_owner_from_table = "risk_teams";
    body.registered_by_from_table = "risk_teams";

    // ===== Validate required =====
    const required: (keyof Payload)[] = [
      "session_id",
      "project_code",
      "risk_title",
      "risk_owner_id",
      "registered_by_id",
      "target_closure_date",
      "open_date",
      "risk_category_code",
      "likelihood_level_id",
      "impact_level_id",
      "status_id",
      "registered_at",
    ];

    for (const k of required) {
      const v = body[k];
      if (v === undefined || v === null || v === "") {
        return NextResponse.json({ error: `${String(k)} is required` }, { status: 400 });
      }
    }

    // ===== Validate category code exists in lookups =====
    const catCode = Number(body.risk_category_code);
    if (!Number.isFinite(catCode)) {
      return NextResponse.json({ error: "risk_category_code must be a number" }, { status: 400 });
    }

    // (แนะนำ) เช็คว่ามีจริงใน lookups เพื่อกันส่ง code แปลก ๆ
    const { rows: catRows } = await pool.query(
      `
      select 1
      from public.mpsmart_lookups
      where gname = 'risk_logs_category'
        and code = $1
        and is_active = true
      limit 1;
      `,
      [catCode]
    );
    if (!catRows?.length) {
      return NextResponse.json({ error: `Invalid risk_category_code: ${catCode}` }, { status: 400 });
    }

    // ===== Validate levels 1..5 =====
    const L = Number(body.likelihood_level_id);
    const I = Number(body.impact_level_id);
    if (![1, 2, 3, 4, 5].includes(L) || ![1, 2, 3, 4, 5].includes(I)) {
      return NextResponse.json(
        { error: "likelihood_level_id and impact_level_id must be 1..5" },
        { status: 400 }
      );
    }

    // ===== Validate dates =====
    if (!isISODate(body.open_date) || !isISODate(body.target_closure_date) || !isISODate(body.registered_at)) {
      return NextResponse.json(
        { error: "open_date / target_closure_date / registered_at must be ISO date" },
        { status: 400 }
      );
    }
    if (body.closed_date && !isISODate(body.closed_date)) {
      return NextResponse.json({ error: "closed_date must be ISO date" }, { status: 400 });
    }

    // ✅ สำคัญ: risk_category_id = code (1..10) เพื่อให้เข้ากับระบบอื่น
    const riskCategoryId = catCode;

    const q = `
      insert into public.mpsmart_risk_logs (
        session_id,
        project_code,
        risk_title,
        risk_description,
        impact_description,
        risk_owner_id,
        workstream,
        migration_strategy,
        target_closure_date,
        closed_date,
        notify_enabled,
        last_notify,
        created_by,
        updated_by,
        risk_category_id,
        likelihood_level_id,
        impact_level_id,
        status_id,
        open_date,
        remark,
        registered_by_id,
        registered_at,
        risk_owner_from_table,
        registered_by_from_table,
        is_escalate_to_pmo,
        is_escalate_to_management,
        from_app,
        risk_owner_user_code,
        registered_by_user_code
      )
      values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29
      )
      on conflict (session_id) where session_id is not null
      do update set
        project_code = excluded.project_code,
        risk_title = excluded.risk_title,
        risk_description = excluded.risk_description,
        impact_description = excluded.impact_description,
        risk_owner_id = excluded.risk_owner_id,
        workstream = excluded.workstream,
        migration_strategy = excluded.migration_strategy,
        target_closure_date = excluded.target_closure_date,
        closed_date = excluded.closed_date,
        notify_enabled = excluded.notify_enabled,
        updated_by = excluded.updated_by,
        risk_category_id = excluded.risk_category_id,
        likelihood_level_id = excluded.likelihood_level_id,
        impact_level_id = excluded.impact_level_id,
        status_id = excluded.status_id,
        open_date = excluded.open_date,
        remark = excluded.remark,
        registered_by_id = excluded.registered_by_id,
        registered_at = excluded.registered_at,
        risk_owner_from_table = excluded.risk_owner_from_table,
        registered_by_from_table = excluded.registered_by_from_table,
        is_escalate_to_pmo = excluded.is_escalate_to_pmo,
        is_escalate_to_management = excluded.is_escalate_to_management,
        from_app = excluded.from_app,
        risk_owner_user_code = excluded.risk_owner_user_code,
        registered_by_user_code = excluded.registered_by_user_code,
        updated_at = now()
      returning id;
    `;

    const values = [
      body.session_id,
      body.project_code,
      body.risk_title,
      body.risk_description ?? null,
      body.impact_description ?? null,
      Number(body.risk_owner_id),
      body.workstream ?? null,
      body.migration_strategy ?? null,
      body.target_closure_date,
      body.closed_date ?? null,
      body.notify_enabled ?? true,
      null,
      "NONGSAIJAI_AI",
      "NONGSAIJAI_AI",
      Number(riskCategoryId), // ✅ code 1..10
      Number(body.likelihood_level_id),
      Number(body.impact_level_id),
      Number(body.status_id),
      body.open_date,
      body.remark ?? null,
      Number(body.registered_by_id),
      body.registered_at,
      "risk_teams",
      "risk_teams",
      body.is_escalate_to_pmo ?? false,
      body.is_escalate_to_management ?? false,
      body.from_app ?? "NongSaiJai",
      body.risk_owner_user_code ?? null,
      body.registered_by_user_code ?? null,
    ];

    const { rows } = await pool.query(q, values);
    return NextResponse.json({ ok: true, id: rows?.[0]?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 });
  }
}
