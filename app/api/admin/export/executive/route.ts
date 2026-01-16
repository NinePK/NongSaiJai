// app/api/admin/export/executive/route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { pool } from "@/lib/db";

/**
 * Executive-friendly export:
 * - No session_id / uuid / user_id
 * - Uses v_ai_session_admin (effective_* already computed)
 * - Risk level computed from ai_risk_scores (1–5 scale)
 */

type RiskLevel = "สูง" | "กลาง" | "ต่ำ";
type ExecStatus = "ปกติ" | "ควรติดตาม" | "มีความเสี่ยง";

function toExecStatus(s?: string | null): ExecStatus {
  if (s === "RISK") return "มีความเสี่ยง";
  if (s === "CONCERN") return "ควรติดตาม";
  if (s === "ISSUE") return "มีความเสี่ยง"; // ✅ ถ้าคุณอยากให้ ISSUE เข้ากลุ่มเสี่ยงสำหรับผู้บริหาร
  return "ปกติ";
}

function toRiskLevel(maxScore: number): RiskLevel {
  if (maxScore >= 5) return "สูง";
  if (maxScore >= 3) return "กลาง";
  return "ต่ำ";
}

function fmtDateTH(v?: string | null): string {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleDateString("th-TH");
  } catch {
    return String(v);
  }
}

function safeMaxRiskScore(riskScores: any): number {
  if (!riskScores || typeof riskScores !== "object") return 0;
  const scores = Object.values(riskScores).map((v: any) => {
    const n = Number(v?.score ?? 0);
    return Number.isFinite(n) ? n : 0;
  });
  return Math.max(0, ...scores);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();

  // Build SQL filters (safe param binding)
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
    select
      proj_code,
      effective_status,
      effective_primary_category,
      ai_summary,
      ai_risk_scores,
      has_override,
      override_notes,
      ai_updated_at
    from public.v_ai_session_admin
    ${where.length ? `where ${where.join(" and ")}` : ""}
  `;

  const { rows: data } = await pool.query(sql, params);

  // Build executive rows
  const rows = (data ?? []).map((r: any) => {
    const maxScore = safeMaxRiskScore(r.ai_risk_scores);
    return {
      project: r.proj_code ?? "-",
      status: toExecStatus(r.effective_status),
      category: r.effective_primary_category ?? "-",
      level: toRiskLevel(maxScore),
      summary: r.ai_summary ?? "",
      admin_note: r.has_override ? (r.override_notes ?? "") : "",
      updated_at: fmtDateTH(r.ai_updated_at),
    };
  });

  // Sort: High -> Medium -> Low
  const rank: Record<RiskLevel, number> = { สูง: 3, กลาง: 2, ต่ำ: 1 };
  rows.sort((a, b) => (rank[b.level] ?? 0) - (rank[a.level] ?? 0));

  // Create workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = "NongSaiJai";
  wb.created = new Date();

  const ws = wb.addWorksheet("Executive Risk Overview");

  ws.columns = [
    { header: "โครงการ", key: "project", width: 18 },
    { header: "สถานะภาพรวม", key: "status", width: 16 },
    { header: "ประเด็นเสี่ยงหลัก", key: "category", width: 22 },
    { header: "ระดับความเสี่ยง", key: "level", width: 14 },
    { header: "สรุปสถานการณ์", key: "summary", width: 55 },
    { header: "หมายเหตุจากผู้ดูแล", key: "admin_note", width: 30 },
    { header: "อัปเดตล่าสุด", key: "updated_at", width: 14 },
  ];

  ws.addRows(rows);

  // Header styling + usability
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columns.length },
  };

  // Wrap text
  ws.getColumn("summary").alignment = { wrapText: true, vertical: "top" };
  ws.getColumn("admin_note").alignment = { wrapText: true, vertical: "top" };

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="Executive_Risk_Report.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
