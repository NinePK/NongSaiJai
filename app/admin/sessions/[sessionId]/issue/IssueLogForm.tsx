// app/admin/sessions/[sessionId]/IssueLogForm.tsx
"use client";

import * as React from "react";
import styles from "./IssueLogModal.module.css";
import { AddIssueComponentModal } from "./AddIssueComponentModal";
import type { LookupItem, ProjectComponent } from "./issue-log.types";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { SaveOverlay } from "../SaveOverlay";

type ProjectPM = {
  id: number;
  user_code: string;
  display_name?: string | null;
  role_title?: string | null;
};

type Props = {
  projectCode: string;
  sessionId: string;
  aiTitle: string;
  aiSummary: string;
  categories: LookupItem[];
  statuses: LookupItem[];
  environments: LookupItem[];
  priorities: LookupItem[];
  components: ProjectComponent[];
  setComponents: React.Dispatch<React.SetStateAction<ProjectComponent[]>>;
  loadingLookups: boolean;
  loadingComponents: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const dateToYMD = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const daysBetween = (aYMD: string, bYMD: string) => {
  const a = new Date(`${aYMD}T00:00:00`);
  const b = new Date(`${bYMD}T00:00:00`);
  const ms = b.getTime() - a.getTime();
  return Number.isNaN(ms) ? 0 : Math.max(0, Math.floor(ms / 86400000));
};

const toISODate = (ymd: string) => new Date(`${ymd}T00:00:00`).toISOString();

const useFetch = <T,>(url: string | null, initialValue: T) => {
  const [data, setData] = React.useState<T>(initialValue);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!url) return;
    setLoading(true);
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setData(Array.isArray(j?.items) ? j.items : initialValue))
      .catch(() => setData(initialValue))
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading };
};

const FormField = ({
  label,
  required,
  children,
  marginTop = true,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  marginTop?: boolean;
}) => (
  <div className={styles.field} style={marginTop ? {} : { marginTop: 0 }}>
    <div className={styles.label}>
      {label} {required && <span className={styles.req}>*</span>}
    </div>
    {children}
  </div>
);

const SelectField = ({
  label,
  required,
  value,
  onChange,
  options,
  loading,
  placeholder = "Select option",
  marginTop,
}: {
  label: string;
  required?: boolean;
  value: number | "";
  onChange: (val: number | "") => void;
  options: { code: number | string; value: string }[];
  loading?: boolean;
  placeholder?: string;
  marginTop?: boolean;
}) => (
  <FormField label={label} required={required} marginTop={marginTop}>
    <select
      className={styles.select}
      value={value}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
      disabled={loading}
    >
      <option value="">{loading ? "Loading..." : placeholder}</option>
      {options.map((opt) => (
        <option key={opt.code} value={opt.code}>
          {opt.value}
        </option>
      ))}
    </select>
  </FormField>
);

const SectionHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div className={styles.sectionTitle}>
    <span>{title}</span>
    <span className={styles.muted}>{subtitle}</span>
  </div>
);

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

  const { data: pms, loading: loadingPMs } = useFetch<ProjectPM[]>(
    projectCode
      ? `/api/mpsmart/project-pms?project_code=${encodeURIComponent(projectCode)}`
      : null,
    [],
  );

  React.useEffect(() => {
    let alive = true;

    async function loadMe() {
      setLoadingMe(true);
      try {
        const res = await fetch("/api/auth", { cache: "no-store" });
        const j = await res.json().catch(() => null);
        const email = j?.email ? String(j.email).trim().toLowerCase() : "";

        if (alive && email) setReportedByEmail(email);
      } catch {
        // ignore
      } finally {
        if (alive) setLoadingMe(false);
      }
    }

    loadMe();
    return () => {
      alive = false;
    };
  }, []);

  const [issueTitle, setIssueTitle] = React.useState(aiTitle ?? "");
  const [categoryCode, setCategoryCode] = React.useState<number | "">("");
  const [statusCode, setStatusCode] = React.useState<number | "">("");
  const [escalatePMO, setEscalatePMO] = React.useState(false);
  const [description, setDescription] = React.useState(aiSummary ?? "");
  const [impact, setImpact] = React.useState("");
  const [openDate, setOpenDate] = React.useState(today);
  const [assigneeId, setAssigneeId] = React.useState<number | "">("");
  const [reportedByEmail, setReportedByEmail] = React.useState("");
  const [loadingMe, setLoadingMe] = React.useState(false);
  const [reportDate, setReportDate] = React.useState(today);
  const [environmentCode, setEnvironmentCode] = React.useState<number | "">("");
  const [priorityCode, setPriorityCode] = React.useState<number | "">("");
  const [componentId, setComponentId] = React.useState<number | "">("");
  const [targetDate, setTargetDate] = React.useState("");
  const [notifyEnabled, setNotifyEnabled] = React.useState(true);
  const [referCaseNo, setReferCaseNo] = React.useState("");
  const [rootCause, setRootCause] = React.useState("");
  const [resolution, setResolution] = React.useState("");
  const [resolutionDate, setResolutionDate] = React.useState("");
  const [remark, setRemark] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saveState, setSaveState] = React.useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [saveMsg, setSaveMsg] = React.useState("");
  const [openAddComponent, setOpenAddComponent] = React.useState(false);

  React.useEffect(() => {
    setIssueTitle(aiTitle ?? "");
    setDescription(aiSummary ?? "");
  }, [aiTitle, aiSummary]);

  React.useEffect(() => {
    if (!assigneeId && pms.length > 0) setAssigneeId(pms[0].id);
  }, [pms, assigneeId]);

  const selectedPM = React.useMemo(
    () => pms.find((x) => x.id === assigneeId) ?? null,
    [assigneeId, pms],
  );

  const agingDays = daysBetween(openDate, today);

  const showError = (msg: string) => {
    setSaveMsg(msg);
    setSaveState("error");
    setTimeout(() => setSaveState("idle"), 1200);
  };

  const onSubmit = async () => {
    if (!projectCode) return showError("ไม่พบ project_code");
    if (!sessionId) return showError("ไม่พบ session_id");
    if (!issueTitle.trim()) return showError("กรุณากรอก Issue title");
    if (!categoryCode) return showError("กรุณาเลือก Category");
    if (!statusCode) return showError("กรุณาเลือก Status");
    if (!description.trim()) return showError("กรุณากรอก Description");
    if (!impact.trim()) return showError("กรุณากรอก Impact");
    if (!openDate) return showError("กรุณาเลือก Open Date");
    if (!assigneeId || !selectedPM?.user_code)
      return showError("กรุณาเลือก Project Manager");
    if (!reportedByEmail || !reportedByEmail.includes("@"))
      return showError("ไม่พบ email ผู้ส่ง (Report By)");
    if (!reportDate) return showError("กรุณาเลือก Report Date");
    if (!environmentCode) return showError("กรุณาเลือก Environment");
    if (!priorityCode) return showError("กรุณาเลือก Priority Level");
    if (!componentId) return showError("กรุณาเลือก Component");
    if (!targetDate) return showError("กรุณาเลือก Target Date");

    const reportedFrom = "pem_emp_rules";

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

      assignee_id: Number(assigneeId),
      assignee_user_code: selectedPM.user_code,
      assignee_from_table: "pm_teams",

      // ✅ NEW: ส่งเป็น email อย่างเดียว
      reported_by_email: reportedByEmail,

      refer_product_case_number: referCaseNo.trim() || null,
      root_cause: rootCause.trim() || null,
      resolution: resolution.trim() || null,
      resolution_date: resolutionDate ? toISODate(resolutionDate) : null,
      remark: remark.trim() || null,
      from_app: "NongSaiJai",
    };

    setSaving(true);
    setSaveState("saving");
    setSaveMsg("");

    try {
      const res = await fetch(`/api/mpsmart/issues`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Insert failed");

      setSaveState("success");
      setSaveMsg("Saved");
      try {
        onSaved?.();
      } catch {}

      setTimeout(() => {
        onClose();
        setSaveState("idle");
        setSaveMsg("");
      }, 700);
    } catch (e: any) {
      setSaveState("error");
      setSaveMsg(e?.message ?? "เกิดข้อผิดพลาด");
      setTimeout(() => setSaveState("idle"), 1400);
    } finally {
      setSaving(false);
    }
  };

  const overlayState: "saving" | "success" | "error" =
    saveState === "idle" ? "saving" : saveState;

  return (
    <>
      {saveState !== "idle" &&
        createPortal(
          <SaveOverlay
            open
            state={overlayState}
            title={
              saveState === "saving"
                ? "กำลังบันทึก Issue..."
                : saveState === "success"
                  ? "บันทึก Issue สำเร็จ"
                  : "บันทึก Issue ไม่สำเร็จ"
            }
            message={
              saveState === "saving"
                ? "โปรดรอสักครู่"
                : saveMsg ||
                  (saveState === "success"
                    ? "ระบบได้บันทึกข้อมูลเรียบร้อยแล้ว"
                    : "กรุณาลองใหม่อีกครั้ง")
            }
          />,
          document.body,
        )}

      {/* Core */}
      <div className={styles.section}>
        <SectionHeader title="Core details" subtitle="required *" />

        <FormField label="Issue title" required>
          <input
            className={styles.input}
            value={issueTitle}
            onChange={(e) => setIssueTitle(e.target.value)}
          />
        </FormField>

        <div className={styles.grid2}>
          <SelectField
            label="Category"
            required
            value={categoryCode}
            onChange={setCategoryCode}
            options={categories}
            loading={loadingLookups}
            marginTop={false}
          />
          <SelectField
            label="Status"
            required
            value={statusCode}
            onChange={setStatusCode}
            options={statuses}
            loading={loadingLookups}
            marginTop={false}
          />
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

        <FormField label="Description" required>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />
        </FormField>

        <FormField label="Impact" required>
          <textarea
            className={styles.textarea}
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            rows={4}
          />
        </FormField>
      </div>

      {/* Dates & People */}
      <div className={styles.section}>
        <SectionHeader
          title="Dates & ownership"
          subtitle="Open / Report / Assignee"
        />

        <div className={styles.grid2}>
          <FormField label="Open Date" required marginTop={false}>
            <input
              type="date"
              className={styles.date}
              value={openDate}
              onChange={(e) => setOpenDate(e.target.value)}
            />
          </FormField>

          <FormField label="Aging" marginTop={false}>
            <input
              className={`${styles.input} ${styles.readonly}`}
              readOnly
              value={`${agingDays} days`}
            />
          </FormField>
        </div>

        <FormField label="Assignee (PM)" required>
          <select
            className={styles.select}
            value={assigneeId}
            onChange={(e) =>
              setAssigneeId(e.target.value ? Number(e.target.value) : "")
            }
            disabled={loadingPMs}
          >
            <option value="">
              {loadingPMs ? "Loading..." : "Select Project Manager"}
            </option>
            {pms.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.display_name?.trim() || pm.user_code} -{" "}
                {pm.role_title?.trim() || "Project Manager"}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Report By (Email)" required>
          <input
            className={`${styles.input} ${styles.readonly}`}
            readOnly
            value={reportedByEmail || (loadingMe ? "Loading..." : "")}
            placeholder="Email from token"
          />
          {!reportedByEmail && !loadingMe && (
            <div className={styles.muted} style={{ marginTop: 6 }}>
              ไม่พบ session/email (ตรวจสอบว่าได้เรียก /api/auth/session
              เพื่อสร้าง nsj_session cookie แล้ว)
            </div>
          )}
        </FormField>

        <FormField label="Report Date" required>
          <input
            type="date"
            className={styles.date}
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
          />
        </FormField>
      </div>

      {/* Classification */}
      <div className={styles.section}>
        <SectionHeader
          title="Classification"
          subtitle="Environment & Priority"
        />
        <div className={styles.grid2}>
          <SelectField
            label="Environment"
            required
            value={environmentCode}
            onChange={setEnvironmentCode}
            options={environments}
            loading={loadingLookups}
            marginTop={false}
          />
          <SelectField
            label="Priority Level"
            required
            value={priorityCode}
            onChange={setPriorityCode}
            options={priorities}
            loading={loadingLookups}
            marginTop={false}
          />
        </div>
      </div>

      {/* Component & Target */}
      <div className={styles.section}>
        <SectionHeader
          title="Component & Target"
          subtitle="Component, Target Date, Noti"
        />

        <div className={styles.grid2}>
          <FormField label="Component" required marginTop={false}>
            <div className={styles.rowInline}>
              <select
                className={styles.select}
                value={componentId}
                onChange={(e) =>
                  setComponentId(e.target.value ? Number(e.target.value) : "")
                }
                disabled={loadingComponents}
              >
                <option value="">
                  {loadingComponents ? "Loading..." : "Select option"}
                </option>
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
          </FormField>

          <FormField label="Target Date" required marginTop={false}>
            <div className={styles.rowInline}>
              <input
                type="date"
                className={styles.date}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
              <label
                className={styles.toggleWrap}
                title="Notification enable/disable"
              >
                Noti
                <input
                  type="checkbox"
                  checked={notifyEnabled}
                  onChange={(e) => setNotifyEnabled(e.target.checked)}
                />
              </label>
            </div>
          </FormField>
        </div>

        <FormField label="Refer to Product Case No.">
          <input
            className={styles.input}
            value={referCaseNo}
            onChange={(e) => setReferCaseNo(e.target.value)}
          />
        </FormField>
      </div>

      {/* Resolution */}
      <div className={styles.section}>
        <SectionHeader title="Resolution" subtitle="Optional" />

        <FormField label="Root Cause" marginTop={false}>
          <input
            className={styles.input}
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
          />
        </FormField>

        <FormField label="Resolution">
          <input
            className={styles.input}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
        </FormField>

        <FormField label="Resolution Date">
          <input
            type="date"
            className={styles.date}
            value={resolutionDate}
            onChange={(e) => setResolutionDate(e.target.value)}
          />
        </FormField>

        <FormField label="Remark">
          <textarea
            className={styles.textarea}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={4}
          />
        </FormField>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.btn}
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={onSubmit}
          disabled={saving || saveState === "success"}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            {saveState === "saving" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {saveState === "success" && <CheckCircle2 className="h-4 w-4" />}
            {saveState === "error" && <XCircle className="h-4 w-4" />}
            {saveState === "saving"
              ? "Submitting..."
              : saveState === "success"
                ? "Submitted"
                : "Submit"}
          </span>
        </button>
      </div>

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
