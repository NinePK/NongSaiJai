//app/admin/sessions/[sessionId]/concern/ConcernLogModal.tsx
"use client";

import * as React from "react";
import styles from "./ConcernLogModal.module.css";
import {
  BACKOFFICE_TEAMS,
  CONCERN_SCOPES,
  type ConcernScope,
  type BackofficeTeamCode,
} from "./concern-targets";

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

export function ConcernLogModal({
  open,
  onClose,
  sessionId,
  projectCode,
  aiTitle,
  aiSummary,
  onSaved,
}: Props) {
  const [saving, setSaving] = React.useState(false);

  const [scope, setScope] = React.useState<ConcernScope>("BACKOFFICE");
  const [backofficeTeams, setBackofficeTeams] = React.useState<
    BackofficeTeamCode[]
  >(["ACCOUNTING"]);

  const [primaryCategory, setPrimaryCategory] =
    React.useState<PrimaryCategory>("");
  const [detail, setDetail] = React.useState("");
  const [recommendation, setRecommendation] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setScope("BACKOFFICE");
    setBackofficeTeams(["ACCOUNTING"]);
    setPrimaryCategory("");
    setDetail("");
    setRecommendation("");
  }, [open]);

  const selectedBackoffices = React.useMemo(() => {
    const map = new Map(BACKOFFICE_TEAMS.map((t) => [t.team_code, t]));
    return backofficeTeams
      .map((code) => map.get(code))
      .filter(Boolean) as typeof BACKOFFICE_TEAMS;
  }, [backofficeTeams]);

  const targets = React.useMemo(() => {
    if (scope !== "BACKOFFICE") {
      const label =
        CONCERN_SCOPES.find((s) => s.scope === scope)?.label ?? scope;
      return [{ scope, label }];
    }

    return selectedBackoffices.map((t) => ({
      scope: "BACKOFFICE" as const,
      team_code: t.team_code,
      team_label: t.team_label,
      group_mail: t.group_mail,
    }));
  }, [scope, selectedBackoffices]);

  const canSave = detail.trim().length >= 1;

  async function onSave() {
    if (saving) return;
    if (!canSave) return;

    const notesPayload = {
      kind: "CONCERN",
      targets,
      target: targets?.[0] ?? null,
      primary_category: primaryCategory || null,
      detail: detail.trim(),
      recommendation: recommendation.trim() || null,
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
          override_status: "CONCERN",
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
              <div className={styles.title}>CONCERN</div>
              <div className={styles.subtitle}>
                Project: <b>{projectCode || "-"}</b>
              </div>
            </div>

            <div className={styles.chip}>Manual</div>
          </div>
        </div>

        <div className={styles.body}>
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

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Classification</div>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <div className={styles.label}>CONCERN ถึงใคร (Scope)</div>
                <select
                  className={styles.select}
                  value={scope}
                  onChange={(e) => setScope(e.target.value as ConcernScope)}
                >
                  {CONCERN_SCOPES.map((s) => (
                    <option key={s.scope} value={s.scope}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

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
              </div>
            </div>

            {scope === "BACKOFFICE" && (
              <div className={styles.field}>
                <div className={styles.label}>
                  เลือกทีม Backoffice (เลือกได้หลายทีม)
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      border: "1px solid rgba(148, 163, 184, 0.22)",
                      borderRadius: 12,
                      padding: 10,
                      maxHeight: 180,
                      overflow: "auto",
                      background: "rgba(2, 49, 176, 0.04)",
                    }}
                  >
                    {BACKOFFICE_TEAMS.map((t) => {
                      const checked = backofficeTeams.includes(t.team_code);
                      return (
                        <label
                          key={t.team_code}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "6px 6px",
                            borderRadius: 10,
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setBackofficeTeams((prev) => {
                                if (on)
                                  return Array.from(
                                    new Set([...prev, t.team_code]),
                                  );
                                const next = prev.filter(
                                  (x) => x !== t.team_code,
                                );
                                return next.length ? next : ["ACCOUNTING"]; // กันว่าง
                              });
                            }}
                          />
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            <div style={{ fontWeight: 900 }}>
                              {t.team_label}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--muted)",
                                fontWeight: 800,
                              }}
                            >
                              {t.group_mail}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div
                    className={styles.kvPill}
                    style={{ alignItems: "flex-start" }}
                  >
                    อีเมลทีมที่เลือก:
                    <b style={{ marginLeft: 8, whiteSpace: "pre-wrap" }}>
                      {selectedBackoffices.map((t) => t.group_mail).join("\n")}
                    </b>
                  </div>
                </div>

                <div className={styles.muted}>
                  ข้อมูล target จะถูกเก็บแบบ structured (หลายทีม) เพื่อทำ report
                  ต่อได้
                </div>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              Notes <span className={styles.muted}>รายละเอียด</span>
            </div>

            <div className={styles.field}>
              <div className={styles.label}>
                รายละเอียด <span className={styles.req}>*</span>
              </div>
              <textarea
                className={styles.textarea}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="เกิดอะไรขึ้น / กระทบอะไร / อยากให้ใครทำอะไร"
              />
              <div className={styles.muted}>
                แนะนำ: ระบุ “สิ่งที่เกิด” + “ผลกระทบ” + “เจ้าของงานที่ควรรับไป”
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.label}>ข้อเสนอแนะ/แนวทาง (optional)</div>
              <textarea
                className={styles.textarea}
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                placeholder="แนวทาง follow-up / สิ่งที่ควรทำต่อ"
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
            className={[styles.btn, styles.btnPrimary].join(" ")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void onSave();
            }}
            disabled={saving || !canSave}
          >
            {saving ? "Saving..." : "Save CONCERN"}
          </button>
        </div>
      </div>
    </div>
  );
}
