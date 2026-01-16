// app/api/mpsmart/issues/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

function toTimestamp(value: any) {
  // รับทั้ง ISO หรือ yyyy-mm-dd ก็ได้
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d; // pg driver รับ Date ได้
}

function toText(v: any) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON body");

  const projectCode = String(body.project_code || "").trim();
  const sessionId = body.session_id ? String(body.session_id) : null;

  if (!projectCode) return bad("project_code is required");

  const issueTitle = String(body.issue_title || "").trim();
  if (!issueTitle) return bad("issue_title is required");

  const issueCategoryId = Number(body.issue_category_id);
  const statusId = Number(body.status_id);
  const environmentTypeId = Number(body.environment_type_id);
  const priorityLevelId = Number(body.priority_level_id);
  const componentId = Number(body.component_id);

  if (!issueCategoryId) return bad("issue_category_id is required");
  if (!statusId) return bad("status_id is required");
  if (!environmentTypeId) return bad("environment_type_id is required");
  if (!priorityLevelId) return bad("priority_level_id is required");
  if (!componentId) return bad("component_id is required");

  const targetDate = toTimestamp(body.target_date);
  if (!targetDate) return bad("target_date is required (invalid date)");

  const openDate = toTimestamp(body.open_date);
  const reportedAt = toTimestamp(body.reported_at);

  // optional text
  const description = toText(body.description);
  const impactDescription = toText(body.impact_description);
  const referProductCaseNumber = toText(body.refer_product_case_number);
  const rootCause = toText(body.root_cause);
  const resolution = toText(body.resolution);
  const resolutionDate = toTimestamp(body.resolution_date);
  const remark = toText(body.remark);

  const notifyEnabled = body.notify_enabled !== undefined ? Boolean(body.notify_enabled) : true;
  const isEscalateToPmo = Boolean(body.is_escalate_to_pmo);
  const isEscalateToManagement = Boolean(body.is_escalate_to_management);

  const fromApp = String(body.from_app || "NongSaiJai").trim() || "NongSaiJai";
  const createdBy = String(body.created_by || "admin").trim() || "admin";

  // Reported by
  // รองรับ sentinel "risk_teams" (ไม่ใช่ user_code จริง)
  const rawReportedByUserCode = toText(body.reported_by_user_code);
  const reportedByFromTable = toText(body.reported_by_from_table);

  const reportedByUserCode =
    rawReportedByUserCode === "risk_teams" ? null : rawReportedByUserCode;

  const reportedByFrom =
    rawReportedByUserCode === "risk_teams"
      ? "risk_teams"
      : (reportedByFromTable || null);

  // Assignee from UI (ถ้ามีให้ใช้ก่อน)
  let assigneeId: number | null =
    body.assignee_id !== undefined && body.assignee_id !== null && body.assignee_id !== ""
      ? Number(body.assignee_id)
      : null;

  if (assigneeId !== null && Number.isNaN(assigneeId)) assigneeId = null;

  let assigneeUserCode: string | null = toText(body.assignee_user_code);

  // ตัวบอกว่า assignee มาจากไหน
  let assigneeFromTable: string | null = null;

  try {
    // ------------------------------------------------------------
    // 1) ถ้า UI ส่ง assignee_id หรือ assignee_user_code มาไม่ครบ
    //    ให้พยายามเติมให้ครบจาก pm_teams ก่อน
    // ------------------------------------------------------------

    // 1.1 มี assigneeId แต่ไม่มี user_code -> หา user_code จาก pm_teams.id
    if (assigneeId && !assigneeUserCode) {
      const r = await pool.query(
        `select trim(user_code) as user_code from public.pm_teams where id = $1 limit 1`,
        [assigneeId]
      );
      const uc = r.rows?.[0]?.user_code ? String(r.rows[0].user_code).trim() : null;
      if (uc) {
        assigneeUserCode = uc;
        assigneeFromTable = "pm_teams";
      }
    }

    // 1.2 มี user_code แต่ไม่มี assigneeId -> หา id ล่าสุดจาก pm_teams.user_code
    if (!assigneeId && assigneeUserCode) {
      const r = await pool.query(
        `
        select id
        from public.pm_teams
        where trim(user_code) = $1
        order by id desc
        limit 1
        `,
        [assigneeUserCode.trim()]
      );
      const id = r.rows?.[0]?.id ?? null;
      if (id) {
        assigneeId = Number(id);
        assigneeFromTable = "pm_teams";
      }
    }

    // ------------------------------------------------------------
    // 2) ถ้ายังไม่มี assignee (ทั้ง id และ user_code) -> fallback resolve
    //    จาก pf_draft_projects.pm_code (ล่าสุดที่ไม่ว่าง) -> pm_teams.user_code
    //    (ตัด role filter ออก + trim)
    // ------------------------------------------------------------
    if (!assigneeId && !assigneeUserCode) {
      const assigneeRes = await pool.query(
        `
        with p as (
          select trim(pm_code) as pm_code
          from public.pf_draft_projects
          where proj_code = $1
            and pm_code is not null
            and trim(pm_code) <> ''
          order by last_modified desc nulls last, id desc
          limit 1
        )
        select
          pt.id as assignee_id,
          trim(pt.user_code) as assignee_user_code
        from p
        join public.pm_teams pt
          on trim(pt.user_code) = p.pm_code
        order by pt.id desc
        limit 1
        `,
        [projectCode]
      );

      const row = assigneeRes.rows?.[0] as
        | { assignee_id: number; assignee_user_code: string }
        | undefined;

      if (row?.assignee_user_code) {
        assigneeUserCode = String(row.assignee_user_code).trim();
        assigneeFromTable = "pm_teams";
      }
      if (row?.assignee_id) {
        assigneeId = Number(row.assignee_id);
        assigneeFromTable = "pm_teams";
      }

      // 2.1 ถ้า join pm_teams ไม่เจอ แต่อย่างน้อยเอา pm_code มาเก็บเป็น user_code ได้
      //     เพื่อไม่ให้ระบบติด 422 ทั้งที่ pf_draft มี pm_code จริง
      if (!assigneeUserCode) {
        const pmCodeRes = await pool.query(
          `
          select trim(pm_code) as pm_code
          from public.pf_draft_projects
          where proj_code = $1
            and pm_code is not null
            and trim(pm_code) <> ''
          order by last_modified desc nulls last, id desc
          limit 1
          `,
          [projectCode]
        );
        const pmCode = pmCodeRes.rows?.[0]?.pm_code
          ? String(pmCodeRes.rows[0].pm_code).trim()
          : null;

        if (pmCode) {
          assigneeUserCode = pmCode;
          assigneeId = null; // หา pm_teams ไม่เจอจริง ๆ
          assigneeFromTable = "pf_draft_projects";
        }
      }
    }

    // ------------------------------------------------------------
    // 3) ตัดสินใจ error/ไม่ error
    //    - ถ้าไม่มีทั้ง user_code เลยจริง ๆ -> 422 (หา PM ไม่เจอจริง)
    //    - ถ้ามี user_code แล้ว แม้ id จะ null -> อนุญาต insert (ได้ผลมากสุด)
    // ------------------------------------------------------------
    if (!assigneeUserCode) {
      return bad(
        `Cannot resolve PM for project_code=${projectCode} (pf_draft_projects.pm_code -> pm_teams.user_code)`,
        422
      );
    }

    if (!assigneeFromTable) {
      assigneeFromTable = assigneeId ? "pm_teams" : "pf_draft_projects";
    }

    // ------------------------------------------------------------
    // 4) Insert into mpsmart_issue_logs
    // ------------------------------------------------------------
const insertRes = await pool.query(
  `
  insert into public.mpsmart_issue_logs (
    project_code,
    issue_title,
    description,
    impact_description,
    refer_product_case_number,
    root_cause,
    resolution,
    remark,

    target_date,
    resolution_date,
    reported_at,
    open_date,

    notify_enabled,
    is_escalate_to_pmo,
    is_escalate_to_management,

    created_at,
    created_by,
    updated_at,
    updated_by,

    issue_category_id,
    priority_level_id,
    status_id,
    environment_type_id,
    component_id,

    assignee_id,
    assignee_user_code,
    assignee_from_table,

    reported_by_user_code,
    reported_by_from_table,

    from_app,
    session_id
  )
  values (
    $1,$2,$3,$4,$5,$6,$7,$8,
    $9,$10,$11,$12,
    $13,$14,$15,
    now(),$16, now(),$16,
    $17,$18,$19,$20,$21,
    $22,$23,$24,
    $25,$26,
    $27,$28
  )
  on conflict (session_id)
  do update set
    project_code              = excluded.project_code,
    issue_title               = excluded.issue_title,
    description               = excluded.description,
    impact_description        = excluded.impact_description,
    refer_product_case_number = excluded.refer_product_case_number,
    root_cause                = excluded.root_cause,
    resolution                = excluded.resolution,
    remark                    = excluded.remark,

    target_date               = excluded.target_date,
    resolution_date           = excluded.resolution_date,
    reported_at               = excluded.reported_at,
    open_date                 = excluded.open_date,

    notify_enabled            = excluded.notify_enabled,
    is_escalate_to_pmo        = excluded.is_escalate_to_pmo,
    is_escalate_to_management = excluded.is_escalate_to_management,

    issue_category_id         = excluded.issue_category_id,
    priority_level_id         = excluded.priority_level_id,
    status_id                 = excluded.status_id,
    environment_type_id       = excluded.environment_type_id,
    component_id              = excluded.component_id,

    assignee_id               = excluded.assignee_id,
    assignee_user_code        = excluded.assignee_user_code,
    assignee_from_table       = excluded.assignee_from_table,

    reported_by_user_code     = excluded.reported_by_user_code,
    reported_by_from_table    = excluded.reported_by_from_table,

    from_app                  = excluded.from_app,

    updated_at                = now(),
    updated_by                = $16
  returning id
  `,
  [
    projectCode,
    issueTitle,
    description,
    impactDescription,
    referProductCaseNumber,
    rootCause,
    resolution,
    remark,

    targetDate,
    resolutionDate,
    reportedAt,
    openDate,

    notifyEnabled,
    isEscalateToPmo,
    isEscalateToManagement,

    createdBy,

    issueCategoryId,
    priorityLevelId,
    statusId,
    environmentTypeId,
    componentId,

    assigneeId,
    assigneeUserCode,
    assigneeFromTable,

    reportedByUserCode,
    reportedByFrom,

    fromApp,
    sessionId,
  ]
);


    const id = insertRes.rows?.[0]?.id ?? null;
    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
  }
}
