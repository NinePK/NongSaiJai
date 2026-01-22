// app/api/admin/export/executive/route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { pool } from "@/lib/db";

type Severity = "High" | "Medium" | "Low";

function safeMaxRiskScore(aiRiskScores: any): number {
  if (!aiRiskScores || typeof aiRiskScores !== "object") return 0;

  const vals = Object.values(aiRiskScores).map((v: any) => {
    const n = Number(v?.score ?? 0);
    return Number.isFinite(n) ? n : 0;
  });

  return Math.max(0, ...vals);
}

function toSeverity(maxScore: number): Severity {
  if (maxScore >= 4) return "High";
  if (maxScore === 3) return "Medium";
  return "Low";
}

function fmtDT(v?: string | null): string {
  if (!v) return "-";
  try {
    // แสดงแบบอ่านง่าย (ปรับได้ตามที่ชอบ)
    return new Date(v).toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return String(v);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  // ✅ filters from UI
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim(); // ISSUE/RISK/CONCERN/NON_RISK
  const category = (url.searchParams.get("category") ?? "").trim(); // People/Process/...
  const mpsent = (url.searchParams.get("mpsent") ?? "").trim(); // SENT/NOT_SENT
  const month = (url.searchParams.get("month") ?? "").trim(); // YYYY-MM

  // Build WHERE + params (safe)
  const where: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (q) {
    // คุณอาจอยากให้ค้นหา title/summary ด้วยก็ได้ แต่เริ่มจาก proj_code ก่อนให้ชัวร์
    where.push(`s.proj_code ilike $${i}`);
    params.push(`%${q}%`);
    i++;
  }

  if (status) {
    where.push(`s.effective_status = $${i}`);
    params.push(status);
    i++;
  }

  if (category) {
    where.push(`s.effective_primary_category = $${i}`);
    params.push(category);
    i++;
  }

  if (mpsent === "SENT") {
    where.push(`s.is_sent_to_mpsmart = true`);
  } else if (mpsent === "NOT_SENT") {
    where.push(`s.is_sent_to_mpsmart = false`);
  }

  // month filter: match month ของ last_message_at (ถ้า null จะไม่เข้าเงื่อนไข)
  if (month) {
    // month format "YYYY-MM" -> use first day
    where.push(
      `date_trunc('month', s.last_message_at) = date_trunc('month', ($${i}::text || '-01')::date)`
    );
    params.push(month);
    i++;
  }

  const sql = `
    select
      s.proj_code,
      p.ref_proj_code as project_name,
      p.pm_name as pm_name,

      s.ai_title,
      s.ai_summary,

      s.ai_risk_scores,
      s.effective_status,
      s.effective_primary_category,

      coalesce(s.last_message_at, s.ai_updated_at) as last_update,

      s.is_unread_by_admin,
      s.is_sent_to_mpsmart,
      s.mpsmart_sent_at

    from public.v_ai_session_admin s
    left join public.v_ai_project p
      on lower(p.proj_code) = lower(s.proj_code)

    ${where.length ? `where ${where.join(" and ")}` : ""}

    order by
      -- ให้ Severity สูงขึ้นก่อน (คำนวณภายหลังใน JS แต่ sort ใน SQL ด้วย last_update เผื่อเท่ากัน)
      coalesce(s.last_message_at, s.ai_updated_at) desc
  `;

  const { rows: data } = await pool.query(sql, params);

  // Build executive rows (ตาม spec ที่คุณอนุมัติ)
  const rows = (data ?? []).map((r: any) => {
    const maxScore = safeMaxRiskScore(r.ai_risk_scores);
    const sev = toSeverity(maxScore);

    return {
      project_code: r.proj_code ?? "-",
      project_name: r.project_name ?? "-",
      pm: r.pm_name ?? "-",
      severity: sev,
      status: r.effective_status ?? "-",
      category: r.effective_primary_category ?? "-",
      ai_title: (r.ai_title ?? "").trim() || "-",
      executive_summary: (r.ai_summary ?? "").trim(),
      last_update: fmtDT(r.last_update),
      unread_by_admin: r.is_unread_by_admin ? "Yes" : "No",
      mpsmart_sent: r.is_sent_to_mpsmart
        ? `Sent (${fmtDT(r.mpsmart_sent_at)})`
        : "Not sent",
    };
  });

  // Sort: High -> Medium -> Low, แล้วค่อย Last Update
  const rank: Record<Severity, number> = { High: 3, Medium: 2, Low: 1 };
  rows.sort((a, b) => {
    const d = (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0);
    if (d !== 0) return d;
    // last_update เป็น string แล้ว; ถ้าต้องเป๊ะให้เก็บ raw date เพิ่มแล้ว sort ด้วย date
    return 0;
  });

  // Create workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = "NongSaiJai";
  wb.created = new Date();

  const ws = wb.addWorksheet("Executive Export");

  ws.columns = [
    { header: "Project Code", key: "project_code", width: 16 },
    { header: "Project Name", key: "project_name", width: 28 },
    { header: "PM", key: "pm", width: 22 },
    { header: "Severity", key: "severity", width: 10 },
    { header: "Status", key: "status", width: 12 },
    { header: "Category", key: "category", width: 14 },
    { header: "AI Title", key: "ai_title", width: 34 },
    { header: "Executive Summary", key: "executive_summary", width: 60 },
    { header: "Last Update", key: "last_update", width: 18 },
    { header: "Unread by Admin", key: "unread_by_admin", width: 14 },
    { header: "MPsmart Sent", key: "mpsmart_sent", width: 22 },
  ];

  ws.addRows(rows);

  // Header styling
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columns.length },
  };

  // Wrap long text
  ws.getColumn("executive_summary").alignment = { wrapText: true, vertical: "top" };
  ws.getColumn("ai_title").alignment = { wrapText: true, vertical: "top" };

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Executive_Export.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
