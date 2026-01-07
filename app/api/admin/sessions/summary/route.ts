import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type KPI = {
  total: number;
  normal: number;
  concern: number;
  risk: number;
  high: number;
  mid: number;
  low: number;
};

function maxRiskScore(riskScores: any): number {
  if (!riskScores || typeof riskScores !== "object") return 0;
  return Math.max(0, ...Object.values(riskScores).map((v: any) => Number(v?.score || 0)));
}

function toRiskLevel(maxScore: number): "สูง" | "กลาง" | "ต่ำ" {
  if (maxScore >= 5) return "สูง";
  if (maxScore >= 3) return "กลาง";
  return "ต่ำ";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

  // NOTE: ดึงเฉพาะฟิลด์ที่จำเป็นต่อ KPI
  let query = supabase.from("v_ai_session_admin").select("effective_status,ai_risk_scores,proj_code");

  if (q) query = query.ilike("proj_code", `%${q}%`);
  if (status) query = query.eq("effective_status", status);

  const { data, error } = await query;

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const kpi: KPI = {
    total: data?.length ?? 0,
    normal: 0,
    concern: 0,
    risk: 0,
    high: 0,
    mid: 0,
    low: 0,
  };

  for (const r of data ?? []) {
    if (r.effective_status === "RISK") kpi.risk++;
    else if (r.effective_status === "CONCERN") kpi.concern++;
    else kpi.normal++;

    const maxScore = maxRiskScore((r as any).ai_risk_scores);
    const lvl = toRiskLevel(maxScore);
    if (lvl === "สูง") kpi.high++;
    else if (lvl === "กลาง") kpi.mid++;
    else kpi.low++;
  }

  return NextResponse.json({ ok: true, kpi });
}
