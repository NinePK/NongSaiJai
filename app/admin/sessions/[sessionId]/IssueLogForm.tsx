// app/admin/sessions/[sessionId]/IssueLogForm.tsx
"use client";

import * as React from "react";
import styles from "./IssueLogModal.module.css";
import { AddIssueComponentModal } from "./AddIssueComponentModal";
import type { LookupItem, ProjectComponent } from "./issue-log.types";

type ProjectPM = {
  id: number;                 // ✅ pm_teams.id
  user_code: string;          // ✅ master_employees.code (same as pm_code/user_code)
  display_name?: string | null; // ✅ master_employees.name_en
  role_title?: string | null;   // ✅ pm_teams.t_role_title
};

type RiskTeamUser = {
  user_code: string;
  display_name?: string | null;
};

function dateToYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function daysBetween(aYMD: string, bYMD: string) {
  const a = new Date(`${aYMD}T00:00:00`);
  const b = new Date(`${bYMD}T00:00:00`);
  const ms = b.getTime() - a.getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}
function toISODate(ymd: string) {
  return new Date(`${ymd}T00:00:00`).toISOString();
}

type Props = {
  projectCode: string;
  sessionId: string;
  aiTitle: string;
  aiSummary: string;

  categories: LookupItem[];
  statuses: LookupItem[];
  environments: LookupItem[]; // issue_logs_environment_type (1..4)
  priorities: LookupItem[];   // issue_logs_priority_level (1..4)

  components: ProjectComponent[];
  setComponents: React.Dispatch<React.SetStateAction<ProjectComponent[]>>;

  loadingLookups: boolean;
  loadingComponents: boolean;

  onClose: () => void;
  onSaved?: () => void;
};

export function IssueLogForm({
  projectCode,
  sessionId,
  aiTitle,
  aiSummary,

  categories,
  statuses,
  environments,
  priorities,

  components,
  setComponents,

  loadingLookups,
  loadingComponents,

  onClose,
  onSaved,
}: Props) {
  const today = dateToYMD(new Date());

  // -------------------------
  // Assignee (PM of project) + Report By (risk_teams + localStorage username)
  // -------------------------
  const [pms, setPMs] = React.useState<ProjectPM[]>([]);
  const [riskTeams, setRiskTeams] = React.useState<RiskTeamUser[]>([]);
  const [loadingPMs, setLoadingPMs] = React.useState(false);
  const [loadingRiskTeams, setLoadingRiskTeams] = React.useState(false);

  const [localUsername, setLocalUsername] = React.useState<string>("");

  React.useEffect(() => {
    try {
      const u = window.localStorage.getItem("username") || "";
      setLocalUsername(u);
    } catch {
      setLocalUsername("");
    }
  }, []);

  React.useEffect(() => {
    if (!projectCode) return;

    // ✅ PMs (ต้องให้ API คืน id,user_code,display_name,role_title)
    setLoadingPMs(true);
    fetch(`/api/mpsmart/project-pms?project_code=${encodeURIComponent(projectCode)}`, {
  cache: "no-store",
})
      .then((r) => r.json())
      .then((j) => setPMs(Array.isArray(j?.items) ? j.items : []))
      .catch(() => setPMs([]))
      .finally(() => setLoadingPMs(false));

    // ✅ risk_teams (Report By options)
    setLoadingRiskTeams(true);
    fetch(`/api/mpsmart/risk-teams?project_code=${encodeURIComponent(projectCode)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((j) => setRiskTeams(Array.isArray(j?.items) ? j.items : []))
      .catch(() => setRiskTeams([]))
      .finally(() => setLoadingRiskTeams(false));
  }, [projectCode]);

  // -------------------------
  // form state
  // -------------------------
  const [issueTitle, setIssueTitle] = React.useState(aiTitle ?? "");
  const [categoryCode, setCategoryCode] = React.useState<number | "">("");
  const [statusCode, setStatusCode] = React.useState<number | "">("");
  const [escalatePMO, setEscalatePMO] = React.useState(false);

  const [description, setDescription] = React.useState(aiSummary ?? "");
  const [impact, setImpact] = React.useState("");

  const [openDate, setOpenDate] = React.useState(today);

  // ✅ เปลี่ยนจาก assigneeUserCode -> assigneeId (pm_teams.id)
  const [assigneeId, setAssigneeId] = React.useState<number | "">("");

  const selectedPM = React.useMemo(() => {
    if (!assigneeId) return null;
    return pms.find((x) => x.id === assigneeId) ?? null;
  }, [assigneeId, pms]);

  const [reportedByUserCode, setReportedByUserCode] = React.useState<string>("");
  const [reportDate, setReportDate] = React.useState(today);

  // from lookups (numeric codes 1..4)
  const [environmentCode, setEnvironmentCode] = React.useState<number | "">("");
  const [priorityCode, setPriorityCode] = React.useState<number | "">("");

  // Component (from project components table)
  const [componentId, setComponentId] = React.useState<number | "">("");
  const [targetDate, setTargetDate] = React.useState("");
  const [notifyEnabled, setNotifyEnabled] = React.useState(true);

  const [referCaseNo, setReferCaseNo] = React.useState("");
  const [rootCause, setRootCause] = React.useState("");
  const [resolution, setResolution] = React.useState("");
  const [resolutionDate, setResolutionDate] = React.useState("");
  const [remark, setRemark] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [openAddComponent, setOpenAddComponent] = React.useState(false);

  React.useEffect(() => {
    setIssueTitle(aiTitle ?? "");
    setDescription(aiSummary ?? "");
  }, [aiTitle, aiSummary]);

  // ถ้าโหลด PM มาแล้วและยังไม่ได้เลือก ให้ auto-select คนแรก
  React.useEffect(() => {
    if (assigneeId) return;
    if (!pms || pms.length === 0) return;
    // เลือกคนแรกเป็น default
    setAssigneeId(pms[0].id);
  }, [pms, assigneeId]);

  const agingDays = daysBetween(openDate, today);

  async function onSubmit() {
    if (!projectCode) return alert("project_code is missing (session has no proj_code)");
    if (!sessionId) return alert("session_id is missing");

    if (!issueTitle.trim()) return alert("Please fill Issue title");
    if (!categoryCode) return alert("Please select Category");
    if (!statusCode) return alert("Please select Status");
    if (!description.trim()) return alert("Please fill Description");
    if (!impact.trim()) return alert("Please fill Impact");
    if (!openDate) return alert("Please select Open Date");

    if (!assigneeId || !selectedPM?.user_code) {
      return alert("Please select Project Manager (Assignee)");
    }

    if (!reportedByUserCode) return alert("Please select Report By");
    if (!reportDate) return alert("Please select Report Date");
    if (!environmentCode) return alert("Please select Environment");
    if (!priorityCode) return alert("Please select Priority Level");
    if (!componentId) return alert("Please select Component");
    if (!targetDate) return alert("Please select Target Date");

    const reportedFrom =
  reportedByUserCode === "risk_teams"
    ? "risk_teams"
    : localUsername && reportedByUserCode === localUsername
    ? "localstorage"
    : "risk_teams";

    // ✅ payload for mpsmart_issue_logs
    const payload = {
      session_id: sessionId,
      project_code: projectCode,

      issue_title: issueTitle.trim(),
      description: description.trim(),
      impact_description: impact.trim(),

      issue_category_id: Number(categoryCode),
      status_id: Number(statusCode),
      environment_type_id: Number(environmentCode),
      priority_level_id: Number(priorityCode),

      component_id: Number(componentId),

      open_date: toISODate(openDate),
      target_date: toISODate(targetDate),
      reported_at: toISODate(reportDate),

      notify_enabled: Boolean(notifyEnabled),

      is_escalate_to_pmo: Boolean(escalatePMO),
      is_escalate_to_management: false,

      // ✅ Assignee: ส่งทั้ง id และ user_code
      assignee_id: Number(assigneeId),
      assignee_user_code: selectedPM.user_code,
      assignee_from_table: "pm_teams",

     reported_by_user_code:
  reportedByUserCode === "risk_teams"
    ? null
    : reportedByUserCode,
reported_by_from_table: reportedFrom,


      refer_product_case_number: referCaseNo.trim() || null,
      root_cause: rootCause.trim() || null,
      resolution: resolution.trim() || null,
      resolution_date: resolutionDate ? toISODate(resolutionDate) : null,
      remark: remark.trim() || null,

      from_app: "NongSaiJai",
      // created_by: localUsername || "admin",
    };

    setSaving(true);
    try {
      const res = await fetch(`/api/mpsmart/issues`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Insert failed");

      alert(`Saved issue id: ${j?.id ?? "-"}`);
      try {
        onSaved?.();
      } catch {}
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "Save error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Core */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>Core details</span>
          <span className={styles.muted}>
            required <span className={styles.req}>*</span>
          </span>
        </div>

        <div className={styles.field}>
          <div className={styles.label}>
            Issue title <span className={styles.req}>*</span>
          </div>
          <input
            className={styles.input}
            value={issueTitle}
            onChange={(e) => setIssueTitle(e.target.value)}
          />
        </div>

        <div className={styles.grid2}>
          <div className={styles.field} style={{ marginTop: 0 }}>
            <div className={styles.label}>
              Category <span className={styles.req}>*</span>
            </div>
            <select
              className={styles.select}
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value ? Number(e.target.value) : "")}
              disabled={loadingLookups}
            >
              <option value="">{loadingLookups ? "Loading..." : "Select option"}</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.value}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field} style={{ marginTop: 0 }}>
            <div className={styles.label}>
              Status <span className={styles.req}>*</span>
            </div>
            <select
              className={styles.select}
              value={statusCode}
              onChange={(e) => setStatusCode(e.target.value ? Number(e.target.value) : "")}
              disabled={loadingLookups}
            >
              <option value="">{loadingLookups ? "Loading..." : "Select option"}</option>
              {statuses.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.controlsRow}>
          <label className={styles.control} style={{ marginLeft: "auto" }}>
            <input
              type="checkbox"
              checked={escalatePMO}
              onChange={(e) => setEscalatePMO(e.target.checked)}
            />
            Escalate to PMO
          </label>
        </div>

        <div className={styles.field}>
          <div className={styles.label}>
            Description <span className={styles.req}>*</span>
          </div>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.label}>
            Impact <span className={styles.req}>*</span>
          </div>
          <textarea
            className={styles.textarea}
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      {/* Dates & People */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>Dates & ownership</span>
          <span className={styles.muted}>Open / Report / Assignee</span>
        </div>

        <div className={styles.grid2}>
          <div className={styles.field} style={{ marginTop: 0 }}>
            <div className={styles.label}>
              Open Date <span className={styles.req}>*</span>
            </div>
            <input
              type="date"
              className={styles.date}
              value={openDate}
              onChange={(e) => setOpenDate(e.target.value)}
            />
          </div>

          <div className={styles.field} style={{ marginTop: 0 }}>
            <div className={styles.label}>Aging</div>
            <input
              className={`${styles.input} ${styles.readonly}`}
              readOnly
              value={`${agingDays} days`}
            />
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.label}>
            Assignee (PM) <span className={styles.req}>*</span>
          </div>
          <select
            className={styles.select}
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : "")}
            disabled={loadingPMs}
          >
            <option value="">{loadingPMs ? "Loading..." : "Select Project Manager"}</option>
            {pms.map((pm) => {
              const name = pm.display_name?.trim() || pm.user_code;
              const role = pm.role_title?.trim() || "Project Manager";
              return (
                <option key={pm.id} value={pm.id}>
                  {name} - {role}
                </option>
              );
            })}
          </select>
        </div>

        <div className={styles.field}>
  <div className={styles.label}>
    Report By <span className={styles.req}>*</span>
  </div>
  <select
  className={styles.select}
  value={reportedByUserCode}
  onChange={(e) => setReportedByUserCode(e.target.value)}
  disabled={loadingRiskTeams}
>
  <option value="" disabled>
    Select Report By
  </option>

  {/* ✅ default สำหรับ DEV */}
  <option value="risk_teams">
    risk_teams
  </option>

  {localUsername && (
    <option value={localUsername}>
      Me: {localUsername}
    </option>
  )}

  {riskTeams
    .filter((u) => !!u.user_code)
    .map((u) => (
      <option key={u.user_code} value={u.user_code}>
        {u.display_name
          ? `${u.display_name} (${u.user_code})`
          : u.user_code}
      </option>
    ))}
</select>
</div>

        <div className={styles.field}>
          <div className={styles.label}>
            Report Date <span className={styles.req}>*</span>
          </div>
          <input
            type="date"
            className={styles.date}
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
          />
        </div>
      </div>

      {/* Classification */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>Classification</span>
          <span className={styles.muted}>Environment & Priority</span>
        </div>

        <div className={styles.grid2}>
          <div className={styles.field} style={{ marginTop: 0 }}>
            <div className={styles.label}>
              Environment <span className={styles.req}>*</span>
            </div>
            <select
              className={styles.select}
              value={environmentCode}
              onChange={(e) => setEnvironmentCode(e.target.value ? Number(e.target.value) : "")}
              disabled={loadingLookups}
            >
              <option value="">{loadingLookups ? "Loading..." : "Select option"}</option>
              {environments.map((x) => (
                <option key={x.code} value={x.code}>
                  {x.value}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field} style={{ marginTop: 0 }}>
            <div className={styles.label}>
              Priority Level <span className={styles.req}>*</span>
            </div>
            <select
              className={styles.select}
              value={priorityCode}
              onChange={(e) => setPriorityCode(e.target.value ? Number(e.target.value) : "")}
              disabled={loadingLookups}
            >
              <option value="">{loadingLookups ? "Loading..." : "Select option"}</option>
              {priorities.map((x) => (
                <option key={x.code} value={x.code}>
                  {x.value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Component & Target */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>Component & Target</span>
          <span className={styles.muted}>Component, Target Date, Noti</span>
        </div>

        <div className={styles.grid2}>
          <div className={styles.field} style={{ marginTop: 0 }}>
            <div className={styles.label}>
              Component <span className={styles.req}>*</span>
            </div>

            <div className={styles.rowInline}>
              <select
                className={styles.select}
                value={componentId}
                onChange={(e) => setComponentId(e.target.value ? Number(e.target.value) : "")}
                disabled={loadingComponents}
              >
                <option value="">{loadingComponents ? "Loading..." : "Select option"}</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.value}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className={styles.iconBtn}
                title="Add component"
                onClick={() => setOpenAddComponent(true)}
              >
                +
              </button>
            </div>
          </div>

          <div className={styles.field} style={{ marginTop: 0 }}>
            <div className={styles.label}>
              Target Date <span className={styles.req}>*</span>
            </div>

            <div className={styles.rowInline}>
              <input
                type="date"
                className={styles.date}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />

              <label className={styles.toggleWrap} title="Notification enable/disable">
                Noti
                <input
                  type="checkbox"
                  checked={notifyEnabled}
                  onChange={(e) => setNotifyEnabled(e.target.checked)}
                />
              </label>
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.label}>Refer to Product Case No.</div>
          <input
            className={styles.input}
            value={referCaseNo}
            onChange={(e) => setReferCaseNo(e.target.value)}
          />
        </div>
      </div>

      {/* Resolution */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>Resolution</span>
          <span className={styles.muted}>Optional</span>
        </div>

        <div className={styles.field} style={{ marginTop: 0 }}>
          <div className={styles.label}>Root Cause</div>
          <input
            className={styles.input}
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.label}>Resolution</div>
          <input
            className={styles.input}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.label}>Resolution Date</div>
          <input
            type="date"
            className={styles.date}
            value={resolutionDate}
            onChange={(e) => setResolutionDate(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.label}>Remark</div>
          <textarea
            className={styles.textarea}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      {/* Footer Buttons */}
      <div className={styles.footer}>
        <button type="button" className={styles.btn} onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={onSubmit}
          disabled={saving}
        >
          {saving ? "Submitting..." : "Submit"}
        </button>
      </div>

      {/* Add Component Modal */}
      <AddIssueComponentModal
        open={openAddComponent}
        onClose={() => setOpenAddComponent(false)}
        projectCode={projectCode}
        onCreated={(created) => {
          setComponents((prev) => {
            const exists = prev.some((x) => x.id === created.id);
            const next = exists ? prev : [...prev, created];
            next.sort((a, b) => String(a.value).localeCompare(String(b.value)));
            return next;
          });
          setComponentId(created.id);
        }}
      />
    </>
  );
}
