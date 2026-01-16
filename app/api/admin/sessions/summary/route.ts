// app/api/admin/sessions/summary/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type KPI = {
  total: number;
  normal: number;
  concern: number;
  risk: number;
  issue: number;   
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
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const status = (url.searchParams.get("status") ?? "").trim(); // RISK/CONCERN/NON_RISK/...

    const where: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (q) {
      where.push(`proj_code ilike $${i}`);
      params.push(`%${q}%`);
      i++;
    }
    if (status) {
      where.push(`effective_status = $${i}`);
      params.push(status);
      i++;
    }

    const sql = `
      select effective_status, ai_risk_scores
      from public.v_ai_session_admin
      ${where.length ? `where ${where.join(" and ")}` : ""}
    `;

    const { rows } = await pool.query(sql, params);

  const kpi: KPI = {
  total: rows?.length ?? 0,
  normal: 0,
  concern: 0,
  risk: 0,
  issue: 0,     
  high: 0,
  mid: 0,
  low: 0,
};

for (const r of rows ?? []) {
  if (r.effective_status === "ISSUE") kpi.issue++;
  else if (r.effective_status === "RISK") kpi.risk++;
  else if (r.effective_status === "CONCERN") kpi.concern++;
  else kpi.normal++;

  const maxScore = maxRiskScore(r.ai_risk_scores);
  const lvl = toRiskLevel(maxScore);
  if (lvl === "สูง") kpi.high++;
  else if (lvl === "กลาง") kpi.mid++;
  else kpi.low++;
}

    return NextResponse.json({ ok: true, kpi });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "DB error" }, { status: 500 });
  }
}
