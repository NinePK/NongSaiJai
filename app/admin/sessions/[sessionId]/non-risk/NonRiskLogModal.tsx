// app/admin/sessions/[sessionId]/non-risk/NonRiskLogModal.tsx
"use client";

import * as React from "react";
import styles from "./NonRiskLogModal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  projectCode: string;
  aiTitle: string;
  aiSummary: string;
  onSaved?: () => void;
};

type PrimaryCategory =
  | "People"
  | "Process"
  | "Quality"
  | "Scope"
  | "Financial"
  | "";

const UI_LABEL = "Informational – No Risk"; // ✅ เปลี่ยนเฉพาะ label ที่แสดงผล
const UI_SAVE_LABEL = "Save Informational"; // ✅ ปรับข้อความปุ่มตามที่ผู้ใช้เห็น

export function NonRiskLogModal({
  open,
  onClose,
  sessionId,
  projectCode,
  aiTitle,
  aiSummary,
  onSaved,
}: Props) {
  const [saving, setSaving] = React.useState(false);

  const [primaryCategory, setPrimaryCategory] =
    React.useState<PrimaryCategory>("");

  const [justification, setJustification] = React.useState("");
  const [assumptions, setAssumptions] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setPrimaryCategory("");
    setJustification("");
    setAssumptions("");
  }, [open]);

  const canSave = justification.trim().length >= 1;

  async function onSave() {
    if (saving) return;
    if (!canSave) return;

    const notesPayload = {
      kind: "NON_RISK", // ✅ เก็บ code เดิมใน notes เพื่อ compatibility
      label: UI_LABEL, // ✅ optional: เก็บ label ที่ใช้แสดงผล (เผื่อ audit)
      justification: justification.trim(),
      assumptions: assumptions.trim() || null,
      primary_category: primaryCategory || null,
      meta: {
        project_code: projectCode || null,
        ai_title: aiTitle || null,
      },
    };

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          override_status: "NON_RISK", // ✅ สำคัญ: ยังส่งค่าเดิมไป API/DB
          primary_category: primaryCategory || null,
          override_notes: JSON.stringify(notesPayload),
        }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Override failed");
      }

      onSaved?.();
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className={[styles.backdrop, open ? styles.backdropOpen : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.shield} onClick={onClose} />

      <div
        className={[styles.panel, open ? styles.panelOpen : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>

            <div className={styles.titleWrap}>
              {/* ✅ เปลี่ยนจาก NON_RISK -> Informational – No Risk */}
              <div className={styles.title}>{UI_LABEL}</div>

              <div className={styles.subtitle}>
                Project: <b>{projectCode || "-"}</b>
              </div>
            </div>

          </div>
        </div>

        <div className={styles.body}>
          {/* Context */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Context</div>

            <div className={styles.field}>
              <div className={styles.label}>AI Title</div>
              <input
                className={[styles.input, styles.readonly].join(" ")}
                value={aiTitle?.trim() || "—"}
                readOnly
              />
            </div>

            <div className={styles.field}>
              <div className={styles.label}>AI Summary</div>
              <textarea
                className={[styles.textarea, styles.readonly].join(" ")}
                value={aiSummary?.trim() || "—"}
                readOnly
              />
            </div>
          </div>

          {/* Decision */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Decision</div>

            <div className={styles.field}>
              <div className={styles.label}>Primary Category (optional)</div>
              <select
                className={styles.select}
                value={primaryCategory}
                onChange={(e) =>
                  setPrimaryCategory(e.target.value as PrimaryCategory)
                }
              >
                <option value="">—</option>
                <option value="People">People</option>
                <option value="Process">Process</option>
                <option value="Quality">Quality</option>
                <option value="Scope">Scope</option>
                <option value="Financial">Financial</option>
              </select>
              <div className={styles.muted}>ถ้าไม่แน่ใจปล่อยว่างได้</div>
            </div>
          </div>

          {/* Notes */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              Notes{" "}
              <span className={styles.muted}>
                เหตุผลที่สรุปว่าเป็น “ข้อมูลเพื่อรับทราบ” และไม่พบความเสี่ยง
              </span>
            </div>

            <div className={styles.field}>
              <div className={styles.label}>
                Justification <span className={styles.req}>*</span>
              </div>
              <textarea
                className={styles.textarea}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="ทำไมถึงสรุปว่าเป็นข้อมูลที่ไม่มีความเสี่ยง"
              />
            </div>

            <div className={styles.field}>
              <div className={styles.label}>
                Assumptions / Conditions (optional)
              </div>
              <textarea
                className={styles.textarea}
                value={assumptions}
                onChange={(e) => setAssumptions(e.target.value)}
                placeholder="เงื่อนไขที่ทำให้ยังเป็นข้อมูลเพื่อรับทราบ (เช่น ถ้ามีการเปลี่ยน scope ให้ re-check)"
              />
              <div className={styles.muted}>
                ใส่ไว้เพื่อกัน “กลับมามี risk/concern” โดยไม่รู้เงื่อนไขเดิม
              </div>
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
            className={[styles.btn, styles.btnPrimary].join(" ")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void onSave();
            }}
            disabled={saving || !canSave}
          >
            {saving ? "Saving..." : UI_SAVE_LABEL}
          </button>
        </div>
      </div>
    </div>
  );
}
