"use client";

import { useState } from "react";
import { SendHorizonal } from "lucide-react";

type Props = { onSend: (text: string) => void; disabled?: boolean };

export default function Composer({ onSend, disabled = false }: Props) {
  const [text, setText] = useState<string>("");

  function submit() {
    const v = text.trim();
    if (!v) return;
    onSend(v);
    setText("");
  }

  return (
    <div
      className="px-5 py-4"
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--card2)",
      }}
    >
      <div className="flex items-end gap-3">
        <div
          className="flex-1 rounded-2xl px-3 py-2"
          style={{
            border: "1px solid var(--border)",
            background: "var(--card)",
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="พิมพ์ข้อความ…"
            rows={1}
            className="chat-input w-full resize-none bg-transparent text-sm outline-none"
            style={{ color: "var(--text)" }}
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={disabled || text.trim().length === 0}
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{
            border: "1px solid var(--border)",
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.95), rgba(168,85,247,0.95))",
            opacity: disabled || text.trim().length === 0 ? 0.45 : 1,
            cursor: disabled || text.trim().length === 0 ? "not-allowed" : "pointer",
          }}
          aria-label="Send"
          title="Send"
        >
          <SendHorizonal className="h-4 w-4 text-white" />
        </button>
      </div>

      <div className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
        Enter เพื่อส่ง • Shift+Enter เพื่อขึ้นบรรทัดใหม่
      </div>
    </div>
  );
}
