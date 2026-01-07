"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import ChatShell from "@/components/chat/ChatShell";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  // ปิดด้วย ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {/* Floating button (bottom-right) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        title={open ? "Close chat" : "Chat with AI"}
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
        }}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {/* Modal panel */}
      {open && (
        <>
          {/* click-outside overlay */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 55,
              background: "rgba(0,0,0,0.25)",
              backdropFilter: "blur(2px)",
            }}
          />

          {/* Right-side small modal */}
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
            }}
          >
            {/* Use existing ChatShell in compact mode */}
            <ChatShell embedded />
          </div>
        </>
      )}
    </>
  );
}
