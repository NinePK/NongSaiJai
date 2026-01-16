// app/admin/sessions/[sessionId]/issue-log.types.ts
export type LookupItem = {
  id: number;
  code: number;
  value: string;
  description: string | null;
};

export type ProjectComponent = {
  id: number;
  value: string;
  description: string;
};

export type Env = "DEV" | "UAT" | "PRD" | "ALL";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type IssuePayload = {
  session_id: string;
  project_code: string;

  issue_title: string;
  category_code: number;
  status_code: number;

  is_escalate_to_pmo: boolean;

  description: string;
  impact: string;

  open_date: string;
  assignee_code: number;

  report_by_code: number;
  report_date: string;

  environment: Env;
  priority: Priority;

  component_id: number;

  target_date: string;
  notify_enabled: boolean;

  refer_product_case_no: string | null;
  root_cause: string | null;
  resolution: string | null;
  resolution_date: string | null;
  remark: string | null;

  from_app: "NongSaiJai";
};
