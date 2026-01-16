// app/admin/sessions/[sessionId]/issue-log.lookups.ts
import type { LookupItem, ProjectComponent } from "./issue-log.types";

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ---------- Lookups (Category/Status/Env/Priority) ----------
export async function fetchLookups() {
  const [c, s, env, pri] = await Promise.all([
    // ✅ Category: ใช้ risk_logs_category (code 1..10)
    fetch(`/api/mpsmart/lookups?gname=risk_logs_category`, { cache: "no-store" })
      .then(safeJson)
      .catch(() => null),

    // ✅ Status: ใช้ issue_logs_status (code 2..8)
    fetch(`/api/mpsmart/lookups?gname=issue_logs_status`, { cache: "no-store" })
      .then(safeJson)
      .catch(() => null),

    // ✅ Environment: issue_logs_environment_type (code 1..4)
    fetch(`/api/mpsmart/lookups?gname=issue_logs_environment_type`, { cache: "no-store" })
      .then(safeJson)
      .catch(() => null),

    // ✅ Priority: issue_logs_priority_level (code 1..4)
    fetch(`/api/mpsmart/lookups?gname=issue_logs_priority_level`, { cache: "no-store" })
      .then(safeJson)
      .catch(() => null),
  ]);

  const categories: LookupItem[] = (c?.items ?? []).filter((x: any) => x.code >= 1 && x.code <= 10);
  const statuses: LookupItem[] = (s?.items ?? []).filter((x: any) => x.code >= 2 && x.code <= 8);
  const environments: LookupItem[] = (env?.items ?? []).filter((x: any) => x.code >= 1 && x.code <= 4);
  const priorities: LookupItem[] = (pri?.items ?? []).filter((x: any) => x.code >= 1 && x.code <= 4);

  return { categories, statuses, environments, priorities };
}

// ---------- Assignee: PM from pm_teams ----------
export type ProjectPM = {
  id: number;
  user_code: string | null;
  role_id: number | null;
  t_role_title: string | null;
};

export async function fetchProjectPMs(projectCode: string) {
  if (!projectCode) return [] as ProjectPM[];

  // ✅ ต้องมี API นี้ (แนะนำสร้างตามที่คุยไว้): /api/mpsmart/project-pm
  const res = await fetch(
    `/api/mpsmart/project-pm?project_code=${encodeURIComponent(projectCode)}`,
    { cache: "no-store" }
  );

  const j = await safeJson(res);
  return Array.isArray(j?.items) ? (j.items as ProjectPM[]) : [];
}

// ---------- Report By: risk_teams ----------
export type RiskTeamUser = {
  user_code: string;
  display_name?: string | null;
};

export async function fetchRiskTeams(projectCode: string) {
  // ถ้า risk_teams ไม่ได้ผูกกับ proj ก็สามารถไม่ส่ง project_code ได้
  const qs = projectCode ? `?project_code=${encodeURIComponent(projectCode)}` : "";
  // ✅ ต้องมี API นี้: /api/mpsmart/risk-teams
  const res = await fetch(`/api/mpsmart/risk-teams${qs}`, { cache: "no-store" });

  const j = await safeJson(res);
  return Array.isArray(j?.items) ? (j.items as RiskTeamUser[]) : [];
}

// ---------- Components ----------
export async function fetchProjectComponents(projectCode: string) {
  if (!projectCode) return [] as ProjectComponent[];

  const res = await fetch(
    `/api/mpsmart/issue-components?project_code=${encodeURIComponent(projectCode)}`,
    { cache: "no-store" }
  );

  const j = await safeJson(res);
  return Array.isArray(j?.items) ? (j.items as ProjectComponent[]) : [];
}