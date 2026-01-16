// app/admin/sessions/[sessionId]/IssueLogModal.tsx
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import styles from "./IssueLogModal.module.css";
import { IssueLogForm } from "./IssueLogForm";

import { fetchLookups, fetchProjectComponents } from "./issue-log.lookups";
import type { LookupItem, ProjectComponent } from "./issue-log.types";

type Props = {
  open: boolean;
  onClose: () => void;
  projectCode: string;
  sessionId: string;
  aiTitle: string;
  aiSummary: string;
  onSaved?: () => void;
};

export function IssueLogModal({
  open,
  onClose,
  sessionId,
  projectCode,
  aiTitle,
  aiSummary,
  onSaved,
}: Props) {
  const [mounted, setMounted] = React.useState(false);

  // drawer animation control (เหมือน RiskLogModal)
  const [show, setShow] = React.useState(false);
  const [animOpen, setAnimOpen] = React.useState(false);
  const CLOSE_MS = 220;

  React.useEffect(() => setMounted(true), []);

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

  React.useEffect(() => {
    if (!show) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [show, onClose]);

  React.useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  // --- lookups: Category/Status/Environment/Priority ---
  const [categories, setCategories] = React.useState<LookupItem[]>([]);
  const [statuses, setStatuses] = React.useState<LookupItem[]>([]);
  const [environments, setEnvironments] = React.useState<LookupItem[]>([]);
  const [priorities, setPriorities] = React.useState<LookupItem[]>([]);
  const [loadingLookups, setLoadingLookups] = React.useState(false);

  // --- components (มาจากตาราง mpsmart_project_issue_components) ---
  const [components, setComponents] = React.useState<ProjectComponent[]>([]);
  const [loadingComponents, setLoadingComponents] = React.useState(false);

  React.useEffect(() => {
    if (!show) return;

    setLoadingLookups(true);
    fetchLookups()
      .then((x) => {
        setCategories(x.categories);
        setStatuses(x.statuses);
        setEnvironments(x.environments);
        setPriorities(x.priorities);
      })
      .finally(() => setLoadingLookups(false));

    setLoadingComponents(true);
    fetchProjectComponents(projectCode)
      .then((items) => setComponents(items))
      .finally(() => setLoadingComponents(false));
  }, [show, projectCode]);

  if (!mounted || !show) return null;

  const drawer = (
    <div
      className={`${styles.backdrop} ${animOpen ? styles.backdropOpen : ""}`}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.shield} onClick={onClose} />

      <aside
        className={`${styles.panel} ${animOpen ? styles.panelOpen : ""}`}
        aria-label="Issue log drawer"
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
              <div className={styles.title}>Add Issue</div>
              <div className={styles.subtitle}>
                Fill required fields (*) before submitting
              </div>
            </div>

            <div className={styles.chip}>{projectCode || "-"}</div>
          </div>
        </div>

        <div className={styles.body}>
          <IssueLogForm
            projectCode={projectCode}
            sessionId={sessionId}
            aiTitle={aiTitle}
            aiSummary={aiSummary}
            onClose={onClose}
            onSaved={onSaved}
            categories={categories}
            statuses={statuses}
            environments={environments}
            priorities={priorities}
            components={components}
            setComponents={setComponents}
            loadingLookups={loadingLookups}
            loadingComponents={loadingComponents}
          />
        </div>
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
}
