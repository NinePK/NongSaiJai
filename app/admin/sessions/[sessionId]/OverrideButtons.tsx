// app/admin/sessions/[sessionId]/OverrideButtons.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiskLogModal } from "./risk/RiskLogModal";
import { IssueLogModal } from "./issue/IssueLogModal";
import { ConcernLogModal } from "./concern/ConcernLogModal";
import { NonRiskLogModal } from "./non-risk/NonRiskLogModal";

type Status = "ISSUE" | "RISK" | "CONCERN" | "NON_RISK";

// ✅ เปลี่ยนเฉพาะ “คำที่แสดงผล” (ไม่กระทบ status จริงในระบบ)
const STATUS_LABEL: Record<Status, string> = {
  ISSUE: "ISSUE",
  RISK: "RISK",
  CONCERN: "CONCERN",
  NON_RISK: "Info - NO RISK",
};

export function OverrideButtons({
  sessionId,
  currentStatus,
  projectCode,
  aiTitle,
  aiSummary,
}: {
  sessionId: string;
  currentStatus: string | null;
  projectCode: string;
  aiTitle: string;
  aiSummary: string;
}) {
  const router = useRouter();

  const [openRiskModal, setOpenRiskModal] = React.useState(false);
  const [openIssueModal, setOpenIssueModal] = React.useState(false);
  const [openConcernModal, setOpenConcernModal] = React.useState(false);
  const [openNonRiskModal, setOpenNonRiskModal] = React.useState(false);
  const [tap, setTap] = React.useState<Status | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const actionUrl = `/api/admin/sessions/${sessionId}/override`;

  async function submitOverrideStatus(s: Status) {
    setSubmitting(true);
    try {
      const res = await fetch(actionUrl, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({ status: s }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Override failed");
      }

      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function onClickStatus(s: Status) {
    if (submitting) return;

    setTap(s);
    window.setTimeout(() => setTap(null), 220);

    if (s === "RISK") {
      window.setTimeout(() => setOpenRiskModal(true), 120);
      return;
    }

    if (s === "ISSUE") {
      window.setTimeout(() => setOpenIssueModal(true), 120);
      return;
    }

    if (s === "CONCERN") {
      window.setTimeout(() => setOpenConcernModal(true), 120);
      return;
    }

    if (s === "NON_RISK") {
      window.setTimeout(() => setOpenNonRiskModal(true), 120);
      return;
    }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["ISSUE", "RISK", "CONCERN", "NON_RISK"] as const).map((s) => {
          const isActive = currentStatus === s;
          const isTap = tap === s;

          return (
            <button
              key={s}
              type="button"
              onClick={() => onClickStatus(s)}
              disabled={submitting}
              className={[
                "nsjBtn",
                isActive ? "isActive" : "",
                isTap ? "isTap" : "",
                s === "RISK" || s === "ISSUE" ? "isDanger" : "",
                s === "CONCERN" ? "isConcern" : "",
                s === "NON_RISK" ? "isNonRisk" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: isActive ? "rgba(59,130,246,0.15)" : "var(--card2)",
                color: "var(--text)",
                fontWeight: 950,
                cursor: submitting ? "not-allowed" : "pointer",
                minWidth: 180, // ✅ ยืดนิดนึง เพราะข้อความยาวขึ้น
                opacity: submitting ? 0.75 : 1,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
              title={STATUS_LABEL[s]} // ✅ เผื่อบางจอเล็ก เห็นเป็น tooltip
            >
              {submitting && isActive ? "Saving..." : STATUS_LABEL[s]}
            </button>
          );
        })}
      </div>

      {/* RISK drawer */}
      <RiskLogModal
        open={openRiskModal}
        onClose={() => setOpenRiskModal(false)}
        sessionId={sessionId}
        projectCode={projectCode}
        aiTitle={aiTitle}
        aiSummary={aiSummary}
        onSaved={async () => {
          await submitOverrideStatus("RISK");
          setOpenRiskModal(false);
        }}
      />

      {/* ISSUE drawer */}
      <IssueLogModal
        open={openIssueModal}
        onClose={() => setOpenIssueModal(false)}
        sessionId={sessionId}
        projectCode={projectCode}
        aiTitle={aiTitle}
        aiSummary={aiSummary}
        onSaved={async () => {
          await submitOverrideStatus("ISSUE");
          setOpenIssueModal(false);
        }}
      />

      {/* CONCERN drawer */}
      <ConcernLogModal
        open={openConcernModal}
        onClose={() => setOpenConcernModal(false)}
        sessionId={sessionId}
        projectCode={projectCode}
        aiTitle={aiTitle}
        aiSummary={aiSummary}
        onSaved={() => {
          router.refresh();
          setOpenConcernModal(false);
        }}
      />

      {/* NON_RISK drawer */}
      <NonRiskLogModal
        open={openNonRiskModal}
        onClose={() => setOpenNonRiskModal(false)}
        sessionId={sessionId}
        projectCode={projectCode}
        aiTitle={aiTitle}
        aiSummary={aiSummary}
        onSaved={() => {
          router.refresh();
          setOpenNonRiskModal(false);
        }}
      />

      <style jsx>{`
        .nsjBtn {
          position: relative;
          transform: translateZ(0);
          transition: transform 140ms ease, filter 140ms ease;
          will-change: transform, filter;
        }
        .nsjBtn:hover {
          filter: brightness(1.03);
        }
        .nsjBtn:active {
          transform: scale(0.98);
        }
        .nsjBtn.isTap {
          animation: nsjPop 220ms cubic-bezier(0.2, 0.9, 0.2, 1);
        }
        .nsjBtn.isDanger.isTap {
          animation: nsjPop 220ms cubic-bezier(0.2, 0.9, 0.2, 1),
            nsjGlow 240ms ease;
        }
        .nsjBtn.isConcern.isTap {
          animation: nsjPop 220ms cubic-bezier(0.2, 0.9, 0.2, 1),
            nsjConcernGlow 240ms ease;
        }
        .nsjBtn.isNonRisk.isTap {
          animation: nsjPop 220ms cubic-bezier(0.2, 0.9, 0.2, 1),
            nsjNonRiskGlow 240ms ease;
        }
        .nsjBtn.isActive {
          filter: saturate(1.05);
        }

        @keyframes nsjPop {
          0% {
            transform: scale(1);
          }
          45% {
            transform: scale(1.06);
          }
          100% {
            transform: scale(1);
          }
        }

        /* RISK/ISSUE glow (แดง) */
        @keyframes nsjGlow {
          0% {
            box-shadow: 0 0 0 rgba(239, 68, 68, 0);
          }
          55% {
            box-shadow: 0 12px 30px rgba(239, 68, 68, 0.18);
          }
          100% {
            box-shadow: 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        /* CONCERN glow (เหลืองอำพัน) */
        @keyframes nsjConcernGlow {
          0% {
            box-shadow: 0 0 0 rgba(245, 158, 11, 0);
          }
          55% {
            box-shadow: 0 12px 30px rgba(245, 158, 11, 0.18);
          }
          100% {
            box-shadow: 0 0 0 rgba(245, 158, 11, 0);
          }
        }

        /* NON_RISK glow (เขียว) */
        @keyframes nsjNonRiskGlow {
          0% {
            box-shadow: 0 0 0 rgba(34, 197, 94, 0);
          }
          55% {
            box-shadow: 0 12px 30px rgba(34, 197, 94, 0.18);
          }
          100% {
            box-shadow: 0 0 0 rgba(34, 197, 94, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nsjBtn,
          .nsjBtn.isTap {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </>
  );
}
