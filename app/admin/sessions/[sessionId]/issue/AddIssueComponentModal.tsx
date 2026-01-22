"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import styles from "./IssueLogModal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  projectCode: string;
  createdBy?: string; // optional
  onCreated: (created: { id: number; value: string; description: string }) => void;
};

export function AddIssueComponentModal({
  open,
  onClose,
  projectCode,
  createdBy = "admin",
  onCreated,
}: Props) {
  const [mounted, setMounted] = React.useState(false);
  const [show, setShow] = React.useState(false);
  const [animOpen, setAnimOpen] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!mounted) return;

    if (open) {
      setShow(true);
      requestAnimationFrame(() => setAnimOpen(true));
      return;
    }

    setAnimOpen(false);
    const t = window.setTimeout(() => setShow(false), 180);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  React.useEffect(() => {
    if (!show) return;
    setTitle("");
    setDesc("");
  }, [show]);

  async function submit() {
    if (!projectCode) return alert("project_code is missing");
    if (!title.trim()) return alert("Please fill Component Title");
    if (!desc.trim()) return alert("Please fill Component Description");

    setSaving(true);
    try {
      const res = await fetch("/api/mpsmart/issue-components", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project_code: projectCode,
          value: title.trim(),
          description: desc.trim(),
          created_by: createdBy,
        }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Create component failed");

      onCreated(j.item);
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "Save error");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || !show) return null;

  return createPortal(
    <div className={`${styles.backdrop} ${animOpen ? styles.backdropOpen : ""}`} role="dialog" aria-modal="true">
      <div className={styles.shield} onClick={onClose} />

      {/* ใช้ panel เดิม แต่ทำให้แคบหน่อยด้วย inline style */}
      <aside
        className={`${styles.panel} ${animOpen ? styles.panelOpen : ""}`}
        style={{ maxWidth: 520 }}
        aria-label="Add Issue Component"
      >
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">
              ←
            </button>

            <div className={styles.titleWrap}>
              <div className={styles.title}>Add Component</div>
              <div className={styles.subtitle}>Create component for this project</div>
            </div>

            <div className={styles.chip}>{projectCode}</div>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <div className={styles.field} style={{ marginTop: 0 }}>
              <div className={styles.label}>
                Component Title <span className={styles.req}>*</span>
              </div>
              <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className={styles.field}>
              <div className={styles.label}>
                Component Description <span className={styles.req}>*</span>
              </div>
              <textarea className={styles.textarea} rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={submit} disabled={saving}>
            {saving ? "Submitting..." : "Submit"}
          </button>
        </div>
      </aside>
    </div>,
    document.body
  );
}
