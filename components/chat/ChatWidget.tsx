// components/chat/ChatWidget.tsx
"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import ChatShell from "@/components/chat/ChatShell";

const ANIM_MS = 220;

// ดึง token จาก ?access_token=... หรือ #access_token=...
function pickTokenFromHashOrQuery() {
  try {
    // query string
    const sp = new URLSearchParams(window.location.search);
    const q =
      sp.get("access_token") ||
      sp.get("token") ||
      sp.get("auth_token") ||
      sp.get("t");
    if (q && q.trim()) return q.trim();

    // hash fragment
    const hash = window.location.hash || "";
    if (hash.startsWith("#")) {
      const hp = new URLSearchParams(hash.slice(1));
      const h =
        hp.get("access_token") ||
        hp.get("token") ||
        hp.get("auth_token") ||
        hp.get("t");
      if (h && h.trim()) return h.trim();
    }

    return null;
  } catch {
    return null;
  }
}

// แลก token → nsj_session cookie + nsj_admin cookie
async function exchangeTokenForSessionOnce() {
  const token = pickTokenFromHashOrQuery();
  if (!token) return;

  // กันยิงซ้ำ (optional)
  const KEY = "nsj_session_exchanged";
  try {
    const already = window.sessionStorage.getItem(KEY);
    if (already === "1") return;
  } catch {}

  const res = await fetch("/api/auth", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token }),
  cache: "no-store",
});

  // ไม่ throw เพื่อไม่ให้ widget พังตอน upstream มีปัญหา
  if (res.ok) {
    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch {}
  }
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false); // target state
  const [isMounted, setIsMounted] = useState(false); // keep in DOM for exit animation

  // ✅ ทำครั้งเดียวตอน mount: แลก token เป็น cookie session
  useEffect(() => {
    exchangeTokenForSessionOnce().catch(() => {});
  }, []);

  function open() {
    setIsMounted(true);
    requestAnimationFrame(() => setIsOpen(true));
  }

  function close() {
    setIsOpen(false);
    window.setTimeout(() => setIsMounted(false), ANIM_MS);
  }

  function toggle() {
    if (isMounted && isOpen) close();
    else open();
  }

  // ESC to close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isMounted) close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMounted]);

  // If user clicks the floating button while closing, re-open cleanly
  useEffect(() => {
    if (!isMounted) setIsOpen(false);
  }, [isMounted]);

  return (
    <>
      {/* Floating button (bottom-right) */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isMounted && isOpen ? "Close chat" : "Open chat"}
        title={isMounted && isOpen ? "Close chat" : "Chat with AI"}
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 60,
          width: 54,
          height: 54,
          borderRadius: 999,
          border: "1px solid var(--border)",
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.95), rgba(168,85,247,0.95))",
          color: "white",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow)",
          cursor: "pointer",
          transform: isMounted && isOpen ? "scale(0.98)" : "scale(1)",
          transition: "transform 180ms cubic-bezier(0.2, 0.9, 0.2, 1)",
        }}
      >
        {isMounted && isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </button>

      {/* Modal (kept mounted for exit animation) */}
      {isMounted && (
        <>
          {/* Overlay with fade + blur (macOS-like) */}
          <div
            onClick={close}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 55,
              background: "rgba(0,0,0,0.28)",
              backdropFilter: "blur(6px)",
              opacity: isOpen ? 1 : 0,
              transition: `opacity ${ANIM_MS}ms ease`,
            }}
          />

          {/* Right-side panel with slide+scale */}
          <div
            style={{
              position: "fixed",
              right: 18,
              bottom: 86,
              zIndex: 56,
              width: 420,
              maxWidth: "calc(100vw - 36px)",
              height: 620,
              maxHeight: "calc(100vh - 120px)",
              borderRadius: 18,
              overflow: "hidden",
              transform: isOpen
                ? "translateY(0px) translateX(0px) scale(1)"
                : "translateY(14px) translateX(10px) scale(0.98)",
              opacity: isOpen ? 1 : 0,
              transition: `
                transform ${ANIM_MS}ms cubic-bezier(0.2, 0.9, 0.2, 1),
                opacity ${ANIM_MS}ms ease
              `,
              boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "var(--card)",
              pointerEvents: isOpen ? "auto" : "none",
            }}
          >
            <ChatShell embedded />
          </div>
        </>
      )}
    </>
  );
}
