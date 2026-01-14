"use client";

import { useEffect, useMemo, useState } from "react";
import MessageList, { ChatMessage } from "@/components/chat/MessageList";
import Composer from "@/components/chat/Composer";
import Link from "next/link";
import { Shield } from "lucide-react";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

const SESSION_KEY = "nongsai_session_id";
// เก็บข้อความแยกตาม session
const HISTORY_PREFIX = "nongsai_history:";

function getOrCreateSessionId() {
  if (typeof window === "undefined") return crypto.randomUUID();

  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function historyKey(sessionId: string) {
  return `${HISTORY_PREFIX}${sessionId}`;
}

function loadHistory(sessionId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(historyKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // basic validation
    return parsed
      .filter((x) => x && typeof x === "object" && typeof x.role === "string" && typeof x.content === "string")
      .map((x) => ({
        id: typeof x.id === "string" ? x.id : uid(),
        role: x.role === "assistant" ? "assistant" : "user",
        content: x.content,
      })) as ChatMessage[];
  } catch {
    return [];
  }
}

function saveHistory(sessionId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    // จำกัดขนาดเพื่อกัน localStorage บวม (เก็บ 200 ข้อความล่าสุด)
    const trimmed = messages.slice(-200);
    localStorage.setItem(historyKey(sessionId), JSON.stringify(trimmed));
  } catch {
    // ignore quota errors
  }
}

export default function ChatShell({ embedded = false }: { embedded?: boolean }) {
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(sessionId));
  const [pending, setPending] = useState(false);

  // Persist messages ทุกครั้งที่เปลี่ยน (เพื่อไม่ให้หายเมื่อปิด modal)
  useEffect(() => {
    saveHistory(sessionId, messages);
  }, [sessionId, messages]);

  function startNewChat() {
    // ล้าง session + ล้าง history ของ session เดิม
    localStorage.removeItem(historyKey(sessionId));
    localStorage.removeItem(SESSION_KEY);

    // reset UI
    setMessages([]);
    // รีโหลดเพื่อให้ session ใหม่ถูกสร้างและใช้ต่อทันที
    window.location.reload();
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;

    const userMsg: ChatMessage = { id: uid(), role: "user", content };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setPending(true);

    try {
      // ส่ง history ไปด้วย (ตามที่คุณทำอยู่)
      const history = nextMessages.map((x) => ({ role: x.role, content: x.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // ถ้าคุณใช้ n8n แนะนำส่ง session_id ให้เป็นชื่อเดียวกัน
          session_id: sessionId,
          conversation_id: sessionId, // เผื่อระบบเดิมยังอ่าน conversation_id
          message: content,
          history,
          meta: { tz: "Asia/Bangkok", client: "nextjs-app-router" },
        }),
      });

      const data = await res.json().catch(() => ({} as any));
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
      className="flex flex-col overflow-hidden"
      style={{
        height: embedded ? "100%" : undefined,
        minHeight: embedded ? undefined : "86vh",
        borderRadius: embedded ? 18 : 24,
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
              น้องใส่ใจ
            </div>
            
          </div>

          <div className="flex items-center gap-2">
  {/* New chat */}
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

  {/* Admin Sessions (แสดงเฉพาะใน Widget) */}
  {embedded && (
    <Link
      href="/admin/sessions"
      title="Admin Sessions"
      className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-extrabold"
      style={{
        border: "1px solid var(--border)",
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: "white",
        textDecoration: "none",
      }}
    >
      <Shield className="h-3.5 w-3.5" />
      Admin
    </Link>
  )}
</div>

        </div>
      </header>

      <MessageList messages={messages} pending={pending} />
      <Composer onSend={send} disabled={pending} />
    </div>
  );
}
