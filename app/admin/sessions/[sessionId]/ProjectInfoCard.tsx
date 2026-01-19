// app/admin/sessions/[sessionId]/ProjectInfoCard.tsx
import { pool } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

type ProjectRow = {
  proj_code: string;
  ref_proj_code: string | null;

  project_status: string | null;
  order_status: string | null;
  order_status_pf: string | null;

  job_type: string | null;
  technology: string | null;
  progress: number | string | null;

  start_date: string | null;
  end_date: string | null;

  total_budget: number | string | null;
  remaining_budget: number | string | null;
  currency: string | null;

  pm_code: string | null;
  pm_name: string | null;
  pm_position: string | null;
  pm_department: string | null;
  pm_email: string | null;

  phase: string | null;
  phase_win_status: string | null;
  phase_order_status: string | null;
};

const fmtDate = (v: string | null) => {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(d);
};

const fmtNumber = (v: number | string | null) => {
  if (v == null) return "-";
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n)
    ? new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n)
    : String(v);
};

const fmtMoney = (v: number | string | null, currency: string | null) => {
  if (v == null) return "-";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return String(v);
  return `${new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
  }).format(n)}${currency ? ` ${currency}` : ""}`;
};

const createLink = (email: string | null, type: "teams" | "outlook") => {
  if (!email) return null;
  const url =
    type === "teams"
      ? `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`
      : `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(email)}`;
  const label = type === "teams" ? "Microsoft Teams" : "Outlook Email";

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{
        fontSize: 13,
        fontWeight: 900,
        color: "var(--text)",
        textDecoration: "underline",
        textUnderlineOffset: 4,
      }}
      title={`${type === "teams" ? "Open Teams chat" : "Compose email"}: ${email}`}
    >
      {label} ↗
    </a>
  );
};

const InfoField = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 900 }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text)" }}>{value ?? "-"}</div>
  </div>
);

export async function ProjectInfoCard({ projCode }: { projCode: string | null }) {
  if (!projCode) return null;

  const sql = `
    select
      v.proj_code,
      v.ref_proj_code,
      v.project_status,
      v.order_status,
      v.order_status_pf,
      v.job_type,
      v.technology,
      v.progress,
      v.start_date,
      v.end_date,
      v.total_budget,
      v.remaining_budget,
      v.currency,
      v.pm_code,
      v.pm_name,
      v.pm_position,
      v.pm_department,
      v.phase,
      v.phase_win_status,
      v.phase_order_status,
      me.company_email as pm_email
    from public.v_ai_project v
    left join public.master_employees me
      on lower(trim(me.code)) = lower(trim(v.pm_code))
    where lower(trim(v.proj_code)) = lower(trim($1))
    limit 1;
  `;

  let row: ProjectRow | null = null;
  try {
    const { rows } = await pool.query<ProjectRow>(sql, [projCode]);
    row = rows?.[0] ?? null;
  } catch {
    row = null;
  }

  const cardStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    background: "var(--card)", // ✅ ให้โทนเท่ากับ Risk Score / Card ใน page.tsx
    borderRadius: 14,
    padding: 16,
    boxShadow: "var(--shadow)",
  };

  const sectionLine: React.CSSProperties = {
    borderTop: "1px solid var(--border)",
    margin: "14px 0",
    opacity: 0.9,
  };

  if (!row) {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 950, color: "var(--text)" }}>Project Details</div>
        </div>
        <div style={{ fontSize: 14, color: "var(--muted)", fontWeight: 800 }}>
          ไม่พบข้อมูลโครงการสำหรับรหัส:{" "}
          <span style={{ fontWeight: 950, color: "var(--text)" }}>{projCode}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 950, color: "var(--text)" }}>Project Details</div>
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)", fontWeight: 900 }}>
            รหัสโครงการ:{" "}
            <span style={{ fontWeight: 950, color: "var(--text)" }}>{row.proj_code}</span>
            {row.ref_proj_code ? (
              <>
                {" "}
                • Ref:{" "}
                <span style={{ fontWeight: 950, color: "var(--text)" }}>{row.ref_proj_code}</span>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {createLink(row.pm_email, "teams") ?? (
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 900 }}>Microsoft Teams —</span>
          )}
          {createLink(row.pm_email, "outlook") ?? (
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 900 }}>Outlook Email —</span>
          )}

          {row.project_status ? (
            <div style={{ marginTop: 6 }}>
              <Badge variant="secondary">Project Status : {row.project_status}</Badge>
            </div>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <InfoField label="Job Type" value={row.job_type} />
        <InfoField label="Technology" value={row.technology} />

        <InfoField label="Progress" value={`${fmtNumber(row.progress)}%`} />
        <InfoField label="Order Status" value={row.order_status} />

        <InfoField label="Start" value={fmtDate(row.start_date)} />
        <InfoField label="End" value={fmtDate(row.end_date)} />
      </div>


      <div style={sectionLine} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 900 }}>PM</div>
          <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text)" }}>
            {row.pm_name ?? "-"}
            {row.pm_code ? <span style={{ color: "var(--muted)", fontWeight: 900 }}> ({row.pm_code})</span> : null}
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)", fontWeight: 800 }}>
            {row.pm_position ?? "-"}
            {row.pm_department ? ` • ${row.pm_department}` : ""}
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)", fontWeight: 800 }}>
            Email:{" "}
            <span style={{ fontWeight: 950, color: "var(--text)" }}>{row.pm_email ?? "-"}</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 900 }}>Phase</div>
          <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text)" }}>{row.phase ?? "-"}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)", fontWeight: 800 }}>
            {row.phase_win_status ? `Win: ${row.phase_win_status}` : "Win: -"} •{" "}
            {row.phase_order_status ? `Order: ${row.phase_order_status}` : "Order: -"}
          </div>
        </div>
      </div>
    </div>
  );
}
