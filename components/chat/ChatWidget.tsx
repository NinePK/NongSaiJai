"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import ChatShell from "@/components/chat/ChatShell";

const ANIM_MS = 220;

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);     // target state
  const [isMounted, setIsMounted] = useState(false); // keep in DOM for exit animation

  function open() {
    setIsMounted(true);
    // next tick -> allow transition from initial styles
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
        {isMounted && isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
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

              // macOS feel: slight scale + vertical offset + ease-out
              transform: isOpen
                ? "translateY(0px) translateX(0px) scale(1)"
                : "translateY(14px) translateX(10px) scale(0.98)",
              opacity: isOpen ? 1 : 0,

              transition: `
                transform ${ANIM_MS}ms cubic-bezier(0.2, 0.9, 0.2, 1),
                opacity ${ANIM_MS}ms ease
              `,

              // “lifted” look
              boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "var(--card)",

              // Prevent interaction while animating out
              pointerEvents: isOpen ? "auto" : "none",
            }}
          >
            {/* Keep ChatShell mounted inside; your messages persistence (localStorage) will keep history */}
            <ChatShell embedded />
          </div>
        </>
      )}
    </>
  );
}
