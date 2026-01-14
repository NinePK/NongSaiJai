"use client";

import * as React from "react";
import { RiskLogModal } from "./RiskLogModal";

type Status = "ISSUE" | "RISK" | "CONCERN" | "NON_RISK";

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
  const [openRiskModal, setOpenRiskModal] = React.useState(false);

  // ✅ เพิ่ม: ใช้สำหรับใส่คลาส animation ตอนกด
  const [tap, setTap] = React.useState<Status | null>(null);

  const actionUrl = `/api/admin/sessions/${sessionId}/override`;

  function submitOverrideStatus(s: Status) {
    const form = document.createElement("form");
    form.method = "post";
    form.action = actionUrl;

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "status";
    input.value = s;
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();
  }

  function onClickStatus(s: Status) {
    // ✅ ยิง animation ก่อน
    setTap(s);
    window.setTimeout(() => setTap(null), 220);

    // ✅ เฉพาะ RISK/ISSUE ให้เล่น “pop” แล้วค่อยเปิด modal
    if (s === "RISK" || s === "ISSUE") {
      window.setTimeout(() => setOpenRiskModal(true), 120);
      return;
    }

    // ✅ อย่างอื่น submit ทันที (ยังมี pop เล็ก ๆ จาก tap)
    submitOverrideStatus(s);
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
              className={[
                "nsjBtn",
                isActive ? "isActive" : "",
                isTap ? "isTap" : "",
                s === "RISK" || s === "ISSUE" ? "isDanger" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: isActive
                  ? "rgba(59,130,246,0.15)"
                  : "var(--card2)",
                color: "var(--text)",
                fontWeight: 950,
                cursor: "pointer",
                minWidth: 120,
              }}
            >
              {s}
            </button>
          );
        })}
      </div>

      <RiskLogModal
        open={openRiskModal}
        onClose={() => setOpenRiskModal(false)}
        projectCode={projectCode}
        aiTitle={aiTitle}
        aiSummary={aiSummary}
        onSaved={() => submitOverrideStatus("RISK")}
      />

      {/* ✅ CSS animation แบบ macOS-ish */}
      <style jsx>{`
        .nsjBtn {
          position: relative;
          transform: translateZ(0);
          transition: transform 140ms ease, filter 140ms ease;
          will-change: transform, filter;
        }

        /* hover/press feel */
        .nsjBtn:hover {
          filter: brightness(1.03);
        }
        .nsjBtn:active {
          transform: scale(0.98);
        }

        /* ตอนกด: pop แบบ spring */
        .nsjBtn.isTap {
          animation: nsjPop 220ms cubic-bezier(0.2, 0.9, 0.2, 1);
        }

        /* RISK/ISSUE ให้มี glow เบา ๆ ตอน pop */
        .nsjBtn.isDanger.isTap {
          animation: nsjPop 220ms cubic-bezier(0.2, 0.9, 0.2, 1),
            nsjGlow 240ms ease;
        }

        /* ถ้าปุ่มถูกเลือกอยู่แล้ว ให้ดู “แน่น” ขึ้นนิด */
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
