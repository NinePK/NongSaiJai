"use client";

import { useEffect, useMemo, useState } from "react";
import MessageList, { ChatMessage } from "@/components/chat/MessageList";
import Composer from "@/components/chat/Composer";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

const SESSION_KEY = "nongsai_session_id";

function getOrCreateConversationId() {
  if (typeof window === "undefined") return crypto.randomUUID();

  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export default function ChatShell() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<boolean>(false);

  const conversationId = useMemo(() => getOrCreateConversationId(), []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY && e.newValue == null) window.location.reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function startNewChat() {
    localStorage.removeItem(SESSION_KEY);
    setMessages([]);
    window.location.reload();
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;

    const userMsg = { id: uid(), role: "user" as const, content };
    const nextMessages = [...messages, userMsg];
    const history = nextMessages.map((x) => ({ role: x.role, content: x.content }));

    setMessages(nextMessages);
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: content,
          history,
          meta: { tz: "Asia/Bangkok", client: "nextjs-app-router" },
        }),
      });

      const data = await res.json();
      const replyText = (data.reply ?? "").toString().trim();

      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          content: replyText || "(ระบบไม่ได้ส่งข้อความตอบกลับ)",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="flex min-h-[86vh] flex-col overflow-hidden rounded-3xl"
      style={{
        border: "1px solid var(--border)",
        background: "var(--card)",
        boxShadow: "var(--shadow)",
        color: "var(--text)",
      }}
    >
      <header
        className="px-5 py-4"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--card2)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-extrabold" style={{ color: "var(--text)" }}>
              Nong Sai Jai
            </div>
            <div className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
              ระบายได้เต็มที่ — ไม่บังคับให้ใส่ proj_code
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startNewChat}
              disabled={pending}
              className="rounded-full px-3 py-2 text-xs font-extrabold"
              style={{
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.6 : 1,
              }}
              title="เริ่มการสนทนาใหม่"
            >
              New chat
            </button>

            <div
              className="rounded-full px-3 py-2 text-xs font-bold"
              style={{
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--muted)",
              }}
            >
              Internal
            </div>
          </div>
        </div>
      </header>

      <MessageList messages={messages} pending={pending} />
      <Composer onSend={send} disabled={pending} />
    </div>
  );
}
