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
    return new Date(v).toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return String(v);
  }
}

// ===== ✅ CONCERN helpers (override_notes JSON) =====
type ConcernNote = {
  kind?: string; // "CONCERN"
  targets?: Array<{
    scope?: string;
    team_code?: string;
    team_label?: string;
    group_mail?: string;
  }>;
  target?: {
    scope?: string;
    team_code?: string;
    team_label?: string;
    group_mail?: string;
  };
};

function safeParseConcernNote(raw?: string | null): ConcernNote | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object") return null;
    return j as ConcernNote;
  } catch {
    return null;
  }
}

/**
 * ✅ Export columns:
 * - concern_scope: PM / PROJECT_TEAM / BACKOFFICE / MANAGEMENT / CUSTOMER / VENDOR ...
 * - backoffice_team: IT_SUPPORT / LEGAL / HR ... (only when scope=BACKOFFICE)
 */
function getConcernScopeAndTeam(overrideNotes?: string | null): {
  concern_scope: string;
  backoffice_team: string;
} {
  const note = safeParseConcernNote(overrideNotes);
  if (!note || note.kind !== "CONCERN") {
    return { concern_scope: "-", backoffice_team: "-" };
  }

  const t = note.target ?? note.targets?.[0];
  const scope = (t?.scope || "").trim();

  if (!scope) return { concern_scope: "-", backoffice_team: "-" };

  if (scope === "BACKOFFICE") {
    const team = (t?.team_code || t?.team_label || "").trim();
    return { concern_scope: "BACKOFFICE", backoffice_team: team || "-" };
  }

  return { concern_scope: scope, backoffice_team: "-" };
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const q = (url.searchParams.get("q") ?? "").trim();
  const statusRaw = (url.searchParams.get("status") ?? "").trim(); // ISSUE/RISK/CONCERN/NON_RISK
  const categoryRaw = (url.searchParams.get("category") ?? "").trim(); // People/Process/...
  const mpsentRaw = (url.searchParams.get("mpsent") ?? "").trim(); // SENT/NOT_SENT
  const month = (url.searchParams.get("month") ?? "").trim(); // YYYY-MM

  // ✅ MULTI
  const concernScopes = url.searchParams
    .getAll("concern_scope")
    .map((s) => s.trim())
    .filter((s) => s && s !== "ALL");

  const backofficeTeams = url.searchParams
    .getAll("backoffice_team")
    .map((s) => s.trim())
    .filter((s) => s && s !== "ALL");

  const status = statusRaw && statusRaw !== "ALL" ? statusRaw : "";
  const category = categoryRaw && categoryRaw !== "ALL" ? categoryRaw : "";
  const mpsent = mpsentRaw && mpsentRaw !== "ALL" ? mpsentRaw : "";

  const where: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (q) {
    where.push(
      `(s.proj_code ILIKE $${i} OR s.ai_summary ILIKE $${i} OR s.ai_title ILIKE $${i})`
    );
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

  if (mpsent === "SENT") where.push(`s.is_sent_to_mpsmart = true`);
  else if (mpsent === "NOT_SENT") where.push(`s.is_sent_to_mpsmart = false`);

  if (month) {
    where.push(
      `date_trunc('month', s.last_message_at) = date_trunc('month', (($${i}::text || '-01')::date))`
    );
    params.push(month);
    i++;
  }

  // ✅ Concern scope filter (อิง override_notes ที่ active)
  if (concernScopes.length > 0) {
    where.push(`
      (
        o.override_status = 'CONCERN'
        AND o.override_notes IS NOT NULL
        AND (o.override_notes::jsonb -> 'target' ->> 'scope') = ANY($${i}::text[])
      )
    `);
    params.push(concernScopes);
    i++;
  }

  // ✅ Backoffice team filter (อิง targets[].team_code)
  if (backofficeTeams.length > 0) {
    where.push(`
      (
        o.override_status = 'CONCERN'
        AND o.override_notes IS NOT NULL
        AND (o.override_notes::jsonb -> 'target' ->> 'scope') = 'BACKOFFICE'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(o.override_notes::jsonb -> 'targets') AS t
          WHERE (t ->> 'team_code') = ANY($${i}::text[])
        )
      )
    `);
    params.push(backofficeTeams);
    i++;
  }

  const sql = `
    SELECT
      s.proj_code,
      p.ref_proj_code AS project_name,
      p.pm_name AS pm_name,

      s.ai_title,
      s.ai_summary,

      s.ai_risk_scores,
      s.effective_status,
      s.effective_primary_category,

      COALESCE(s.last_message_at, s.ai_updated_at) AS last_update,

      s.is_unread_by_admin,
      s.is_sent_to_mpsmart,
      s.mpsmart_sent_at,

      -- ✅ bring override_notes for CONCERN export
      o.override_notes

    FROM public.v_ai_session_admin s
    LEFT JOIN public.v_ai_project p
      ON lower(p.proj_code) = lower(s.proj_code)

    -- ✅ join override เพื่อ filter scope/team (เฉพาะ active)
    LEFT JOIN public.ai_admin_overrides o
      ON o.session_id = s.session_id
     AND o.is_active = true

    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}

    ORDER BY COALESCE(s.last_message_at, s.ai_updated_at) DESC
  `;

  const { rows: data } = await pool.query(sql, params);

  const rows = (data ?? []).map((r: any) => {
    const maxScore = safeMaxRiskScore(r.ai_risk_scores);
    const sev = toSeverity(maxScore);

    const { concern_scope, backoffice_team } = getConcernScopeAndTeam(
      r.override_notes
    );

    return {
      project_code: r.proj_code ?? "-",
      project_name: r.project_name ?? "-",
      pm: r.pm_name ?? "-",
      severity: sev,
      status: r.effective_status ?? "-",
      category: r.effective_primary_category ?? "-",
      ai_title: (r.ai_title ?? "").trim() || "-",
      executive_summary: (r.ai_summary ?? "").trim(),
      concern_scope,
      backoffice_team,
      last_update: fmtDT(r.last_update),
      unread_by_admin: r.is_unread_by_admin ? "Yes" : "No",
      mpsmart_sent: r.is_sent_to_mpsmart
        ? `Sent (${fmtDT(r.mpsmart_sent_at)})`
        : "Not sent",
    };
  });

  // (optional) sort severity
  const rank: Record<Severity, number> = { High: 3, Medium: 2, Low: 1 };
  rows.sort((a, b) => (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0));

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

    // ✅ NEW: CONCERN info
    { header: "Concern Scope", key: "concern_scope", width: 16 },
    { header: "Backoffice Team", key: "backoffice_team", width: 18 },

    { header: "Last Update", key: "last_update", width: 18 },
    { header: "Unread by Admin", key: "unread_by_admin", width: 14 },
    { header: "MPsmart Sent", key: "mpsmart_sent", width: 22 },
  ];

  ws.addRows(rows);

  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columns.length },
  };

  ws.getColumn("executive_summary").alignment = {
    wrapText: true,
    vertical: "top",
  };
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
