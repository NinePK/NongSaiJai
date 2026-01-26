// app/admin/sessions/%5BsessionId%5D/risk/RiskLogModal.tsx
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import styles from "./RiskLogModal.module.css";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { SaveOverlay } from "../SaveOverlay";

// ✅ เพิ่ม code
type LookupItem = {
  id: number;
  code: number;
  value: string;
  description: string | null;
};

function dateToYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  projectCode: string;
  sessionId: string;
  aiTitle: string;
  aiSummary: string;
  onSaved?: () => void;
};



export function RiskLogModal({
  open,
  onClose,
  sessionId,
  projectCode,
  aiTitle,
  aiSummary,
  onSaved,
}: Props) {
  const [mounted, setMounted] = React.useState(false);

  // ✅ สำหรับ animation: show = ยัง render อยู่, animOpen = ใส่ class เปิด/ปิด
  const [show, setShow] = React.useState(false);
  const [animOpen, setAnimOpen] = React.useState(false);

  const CLOSE_MS = 220; // ต้องสอดคล้องกับ CSS transition

  React.useEffect(() => setMounted(true), []);

  // ✅ open/close with exit animation
  React.useEffect(() => {
    if (!mounted) return;

    if (open) {
      setShow(true);
      requestAnimationFrame(() => setAnimOpen(true));
      return;
    }

    setAnimOpen(false);
    const t = window.setTimeout(() => setShow(false), CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  // close on ESC (เฉพาะตอนที่ show อยู่)
  React.useEffect(() => {
    if (!show) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [show, onClose]);

  // lock scroll when visible
  React.useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  // ---- Lookups ----
  const [categories, setCategories] = React.useState<LookupItem[]>([]);
  const [loadingLookups, setLoadingLookups] = React.useState(false);

  React.useEffect(() => {
    if (!show) return;
    setLoadingLookups(true);
    fetch(`/api/mpsmart/lookups?gname=risk_logs_category`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((j) => setCategories(j.items ?? []))
      .finally(() => setLoadingLookups(false));
  }, [show]);

  // ---- Form state ----
  // ✅ เปลี่ยนจาก id -> code
  const [riskCategoryCode, setRiskCategoryCode] = React.useState<number | "">(
    "",
  );
  const [registeredDate] = React.useState<string>(dateToYMD(new Date()));

  const [riskTitle, setRiskTitle] = React.useState<string>(aiTitle ?? "");
  const [riskDesc, setRiskDesc] = React.useState<string>(aiSummary ?? "");
  const [impactDesc, setImpactDesc] = React.useState<string>("");

  const [likelihood, setLikelihood] = React.useState<number>(1);
  const [impact, setImpact] = React.useState<number>(1);

  const [workstream, setWorkstream] = React.useState<string>("");
  const [statusOpen, setStatusOpen] = React.useState<boolean>(true);
  const [escalatePMO, setEscalatePMO] = React.useState<boolean>(false);

  const [riskOwnerId, setRiskOwnerId] = React.useState<number>(1);
  const [registeredById, setRegisteredById] = React.useState<number>(1);
  const [statusId, setStatusId] = React.useState<number>(1);

  const [targetDate, setTargetDate] = React.useState<string>(""); // YYYY-MM-DD
  const [remark, setRemark] = React.useState<string>("");

  const [saving, setSaving] = React.useState(false);
  const [saveState, setSaveState] = React.useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [saveMsg, setSaveMsg] = React.useState<string>("");

  React.useEffect(() => {
    if (!show) return;
    setRiskTitle(aiTitle ?? "");
    setRiskDesc(aiSummary ?? "");
  }, [show, aiTitle, aiSummary]);

  React.useEffect(() => {
    setStatusId(statusOpen ? 1 : 2);
  }, [statusOpen]);

  const score = likelihood * impact;

  function getUserCodeFromLocalStorage(): string | null {
    try {
      const v = window.localStorage.getItem("user_code");
      const s = (v ?? "").trim();
      return s.length ? s : null;
    } catch {
      return null;
    }
  }

  async function onSave() {
    if (!projectCode) {
      setSaveMsg("ไม่พบ project_code ของโครงการนี้");
      setSaveState("error");
      window.setTimeout(() => setSaveState("idle"), 1200);
      return;
    }
    if (!riskCategoryCode) {
      setSaveMsg("กรุณาเลือก Risk Category");
      setSaveState("error");
      window.setTimeout(() => setSaveState("idle"), 1200);
      return;
    }

    if (!targetDate) {
      setSaveMsg("กรุณาเลือก Target Date");
      setSaveState("error");
      window.setTimeout(() => setSaveState("idle"), 1200);
      return;
    }

    if (!sessionId) {
      setSaveMsg("ไม่พบ session_id ของรายการนี้");
      setSaveState("error");
      window.setTimeout(() => setSaveState("idle"), 1200);
      return;
    }

    const now = new Date();
    const openISO = now.toISOString();
    const registeredISO = new Date(`${registeredDate}T00:00:00`).toISOString();
    const targetISO = new Date(`${targetDate}T00:00:00`).toISOString();

    const payload = {
      session_id: sessionId,
      project_code: projectCode,

      risk_title: riskTitle,
      risk_description: riskDesc || null,
      impact_description: impactDesc || null,

      risk_owner_id: null,
      registered_by_id: null,

      workstream: workstream || null,
      migration_strategy: null,

      target_closure_date: targetISO,
      open_date: openISO,
      closed_date: null,

      remark: remark || null,

      risk_category_code: Number(riskCategoryCode),

      likelihood_level_id: Number(likelihood),
      impact_level_id: Number(impact),

      status_id: Number(statusId),
      registered_at: registeredISO,

      risk_owner_from_table: "risk_teams",
      registered_by_from_table: "risk_teams",

      risk_owner_user_code: null,
      registered_by_user_code: null,

      notify_enabled: true,
      is_escalate_to_pmo: Boolean(escalatePMO),
      is_escalate_to_management: false,

      from_app: "NongSaiJai",
    };

    setSaving(true);
    setSaveState("saving");
    setSaveMsg("");

    try {
      const res = await fetch(`/api/mpsmart/risk-logs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Insert failed");

      setSaveState("success");
      setSaveMsg("บันทึก Risk เรียบร้อยแล้ว");

      try {
        onSaved?.();
      } catch {}

      window.setTimeout(() => {
        setSaveState("idle");
        onClose();
      }, 900);
    } catch (e: any) {
      setSaveState("error");
      setSaveMsg(e?.message ?? "Save error");

      window.setTimeout(() => {
        setSaveState("idle");
      }, 1400);
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || !show) return null;

  const drawer = (
    <div
      className={`${styles.backdrop} ${animOpen ? styles.backdropOpen : ""}`}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.shield} onClick={onClose} />

      {/* ✅ ใส่ Overlay ตรงนี้เลย */}
      <SaveOverlay
        open={saveState !== "idle"}
        state={saveState === "idle" ? "saving" : saveState}
        title={
          saveState === "saving"
            ? "กำลังบันทึก Risk..."
            : saveState === "success"
              ? "บันทึก Risk สำเร็จ"
              : "บันทึก Risk ไม่สำเร็จ"
        }
        message={
          saveState === "saving"
            ? "โปรดรอสักครู่"
            : saveMsg ||
              (saveState === "success"
                ? "ระบบได้บันทึกข้อมูลเรียบร้อยแล้ว"
                : "กรุณาลองใหม่อีกครั้ง")
        }
      />

      <aside
        className={`${styles.panel} ${animOpen ? styles.panelOpen : ""}`}
        aria-label="Risk log drawer"
      >
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <button
              type="button"
              onClick={onClose}
              className={styles.closeBtn}
              aria-label="Close"
            >
              ←
            </button>

            <div className={styles.titleWrap}>
              <div className={styles.title}>Add Risk</div>
              <div className={styles.subtitle}>
                Prefilled from AI Summary — edit before saving
              </div>
            </div>

            <div className={styles.chip}>{projectCode || "-"}</div>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>Core details</span>
              <span className={styles.muted}>
                required <span className={styles.req}>*</span>
              </span>
            </div>

            <div className={styles.field}>
              <div className={styles.label}>
                Category <span className={styles.req}>*</span>
              </div>

              {/* ✅ เปลี่ยน select ให้ใช้ code */}
              <select
                className={styles.select}
                value={riskCategoryCode}
                onChange={(e) =>
                  setRiskCategoryCode(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
                disabled={loadingLookups}
              >
                <option value="">
                  {loadingLookups ? "Loading..." : "-- Select --"}
                </option>

                {categories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.value}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <div className={styles.label}>
                Register date <span className={styles.req}>*</span>
              </div>
              <input
                className={`${styles.input} ${styles.readonly}`}
                value={registeredDate}
                readOnly
              />
            </div>

            <div className={styles.field}>
              <div className={styles.label}>
                Risk title <span className={styles.req}>*</span>
              </div>
              <input
                className={styles.input}
                value={riskTitle}
                onChange={(e) => setRiskTitle(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <div className={styles.label}>
                Description <span className={styles.req}>*</span>
              </div>
              <textarea
                className={styles.textarea}
                value={riskDesc}
                onChange={(e) => setRiskDesc(e.target.value)}
                rows={5}
              />
            </div>

            <div className={styles.field}>
              <div className={styles.label}>
                Impact <span className={styles.req}>*</span>
              </div>
              <textarea
                className={styles.textarea}
                value={impactDesc}
                onChange={(e) => setImpactDesc(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>Risk assessment</span>
              <span className={styles.metaRight}>
                Score <span className={styles.scorePill}>{score}</span>
              </span>
            </div>

            <div className={styles.grid2}>
              <div className={styles.field} style={{ marginTop: 0 }}>
                <div className={styles.label}>
                  Likelihood <span className={styles.req}>*</span>
                </div>
                <select
                  className={styles.select}
                  value={likelihood}
                  onChange={(e) => setLikelihood(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field} style={{ marginTop: 0 }}>
                <div className={styles.label}>
                  Impact level <span className={styles.req}>*</span>
                </div>
                <select
                  className={styles.select}
                  value={impact}
                  onChange={(e) => setImpact(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.label}>Workstream</div>
              <input
                className={styles.input}
                value={workstream}
                onChange={(e) => setWorkstream(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <div className={styles.label}>
                Target date <span className={styles.req}>*</span>
              </div>
              <input
                type="date"
                className={styles.date}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>Operational</span>
              <span className={styles.muted}>Status & escalation</span>
            </div>

            <div className={styles.controlsRow}>
              <label className={styles.control}>
                <input
                  type="radio"
                  checked={statusOpen}
                  onChange={() => setStatusOpen(true)}
                />
                Open
              </label>
              <label className={styles.control}>
                <input
                  type="radio"
                  checked={!statusOpen}
                  onChange={() => setStatusOpen(false)}
                />
                Close
              </label>

              <label className={styles.control} style={{ marginLeft: "auto" }}>
                <input
                  type="checkbox"
                  checked={escalatePMO}
                  onChange={(e) => setEscalatePMO(e.target.checked)}
                />
                Escalate to PMO
              </label>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>Notes</span>
              <span className={styles.muted}>Optional</span>
            </div>

            <div className={styles.field} style={{ marginTop: 0 }}>
              <div className={styles.label}>Remark</div>
              <textarea
                className={styles.textarea}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={4}
              />
            </div>

            <div style={{ display: "none" }}>
              <input
                value={riskOwnerId}
                onChange={(e) => setRiskOwnerId(Number(e.target.value))}
              />
              <input
                value={registeredById}
                onChange={(e) => setRegisteredById(Number(e.target.value))}
              />
              <input
                value={statusId}
                onChange={(e) => setStatusId(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

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
            onClick={onSave}
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
                ? "Saving..."
                : saveState === "success"
                  ? "Saved"
                  : "Save"}
            </span>
          </button>
        </div>
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
}
