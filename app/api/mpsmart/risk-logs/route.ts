import { NextRequest, NextResponse } from "next/server";
import { supabasePublicServer } from "@/lib/supabasePublicServer";

type Payload = {
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

  risk_category_id: number;
  likelihood_level_id: number; // 1..5
  impact_level_id: number; // 1..5

  status_id: number; // ต้องเป็น id จริงของระบบคุณ
  registered_at: string; // ISO string

  risk_owner_from_table: string;
  registered_by_from_table: string;

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

    // ===== Validate required =====
    const required: (keyof Payload)[] = [
      "project_code",
      "risk_title",
      "risk_owner_id",
      "registered_by_id",
      "target_closure_date",
      "open_date",
      "risk_category_id",
      "likelihood_level_id",
      "impact_level_id",
      "status_id",
      "registered_at",
      "risk_owner_from_table",
      "registered_by_from_table",
    ];

    for (const k of required) {
      const v = body[k];
      if (v === undefined || v === null || v === "") {
        return NextResponse.json({ error: `${String(k)} is required` }, { status: 400 });
      }
    }

    // ===== Validate levels 1..5 =====
    const L = Number(body.likelihood_level_id);
    const I = Number(body.impact_level_id);
    if (![1, 2, 3, 4, 5].includes(L) || ![1, 2, 3, 4, 5].includes(I)) {
      return NextResponse.json({ error: "likelihood_level_id and impact_level_id must be 1..5" }, { status: 400 });
    }

    // ===== Validate dates =====
    if (!isISODate(body.open_date) || !isISODate(body.target_closure_date) || !isISODate(body.registered_at)) {
      return NextResponse.json({ error: "open_date / target_closure_date / registered_at must be ISO date" }, { status: 400 });
    }
    if (body.closed_date && !isISODate(body.closed_date)) {
      return NextResponse.json({ error: "closed_date must be ISO date" }, { status: 400 });
    }

    const sb = supabasePublicServer();

    const row = {
      project_code: body.project_code,
      risk_title: body.risk_title,
      risk_description: body.risk_description ?? null,
      impact_description: body.impact_description ?? null,
      risk_owner_id: Number(body.risk_owner_id),
      workstream: body.workstream ?? null,
      migration_strategy: body.migration_strategy ?? null,
      target_closure_date: body.target_closure_date,
      closed_date: body.closed_date ?? null,
      notify_enabled: body.notify_enabled ?? true,
      last_notify: null,
      created_by: "NONGSAIJAI_AI",
      updated_by: "NONGSAIJAI_AI",
      risk_category_id: Number(body.risk_category_id),
      likelihood_level_id: Number(body.likelihood_level_id),
      impact_level_id: Number(body.impact_level_id),
      status_id: Number(body.status_id),
      open_date: body.open_date,
      remark: body.remark ?? null,
      registered_by_id: Number(body.registered_by_id),
      registered_at: body.registered_at,
      risk_owner_from_table: body.risk_owner_from_table,
      registered_by_from_table: body.registered_by_from_table,
      is_escalate_to_pmo: body.is_escalate_to_pmo ?? false,
      is_escalate_to_management: body.is_escalate_to_management ?? false,
      from_app: body.from_app ?? "NongSaiJai",
    };

    const { data, error } = await sb
      .from("mpsmart_risk_logs")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      // ถ้าติด RLS/permission จะออกที่นี่
      return NextResponse.json(
        {
          error: error.message,
          hint:
            "If this is an RLS/permission error, you must allow INSERT for the caller (anon/authenticated) on mpsmart_risk_logs.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 });
  }
}
