// components/chat/ChatShell.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import MessageList, { ChatMessage } from "@/components/chat/MessageList";
import Composer from "@/components/chat/Composer";
import { Shield } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

// ✅ ใช้ ENV
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

const SESSION_KEY = "nongsai_session_id";
const HISTORY_PREFIX = "nongsai_history:";

// ✅ token ที่ถูก set ใน /chat/embed/page.tsx (sessionStorage)
const BEARER_TOKEN_KEY = "nsj_bearer_token";

function getBearerTokenFromSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const t = sessionStorage.getItem(BEARER_TOKEN_KEY);
    return t && t.trim().length > 10 ? t.trim() : null;
  } catch {
    return null;
  }
}

async function fetchAuthWithFallback() {
  // 1) cookie-first
  let r = await fetch("/api/auth", {
    cache: "no-store",
    credentials: "include",
  });

  const ct1 = r.headers.get("content-type") || "";
  let j: any = null;

  if (ct1.includes("application/json")) {
    j = await r.json().catch(() => null);
  } else {
    // ไม่ใช่ JSON -> คืนให้ caller จัดการต่อ
    return { r, j };
  }

  // 2) ถ้า cookie ใช้ไม่ได้ -> Bearer fallback
  if (r.status === 401) {
    const token = getBearerTokenFromSession();
    if (token) {
      r = await fetch("/api/auth", {
        cache: "no-store",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });

      const ct2 = r.headers.get("content-type") || "";
      if (ct2.includes("application/json")) {
        j = await r.json().catch(() => null);
      } else {
        j = null;
      }
    }
  }

  return { r, j };
}

function getOrCreateSessionId() {
  if (typeof window === "undefined") return uuidv4();

  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uuidv4();
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
    return parsed
      .filter(
        (x) =>
          x &&
          typeof x === "object" &&
          typeof x.role === "string" &&
          typeof x.content === "string"
      )
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
    const trimmed = messages.slice(-200);
    localStorage.setItem(historyKey(sessionId), JSON.stringify(trimmed));
  } catch {
    // ignore quota errors
  }
}

export default function ChatShell({ embedded = false }: { embedded?: boolean }) {
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadHistory(sessionId)
  );
  const [pending, setPending] = useState(false);
  const [enteringAdmin, setEnteringAdmin] = useState(false);
  const [canSeeAdmin, setCanSeeAdmin] = useState(false);

  async function enterAdmin() {
    try {
      setEnteringAdmin(true);

      // ✅ cookie-first + bearer fallback
      const { r, j } = await fetchAuthWithFallback();

      const ct = r.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const t = await r.text();
        alert(`เข้า Admin ไม่ได้ (HTTP ${r.status})\n${t.slice(0, 200)}...`);
        return;
      }

      if (!r.ok || !j?.ok) {
        alert(`เข้า Admin ไม่ได้ (HTTP ${r.status})\n${JSON.stringify(j)}`);
        return;
      }

      if (!j.isAdmin) {
        alert("คุณไม่มีสิทธิ์เข้า Admin");
        return;
      }

      // ✅ ถ้าอยู่ใน embedded mode (iframe) ให้บอก parent
      if (embedded && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "NSJ_OPEN_ADMIN",
            url: `${BASE_URL}/admin/sessions`,
          },
          "*"
        );
      } else {
        // ✅ ถ้าไม่ได้อยู่ใน iframe ให้เปิดปกติ
        window.location.href = "/admin/sessions";
      }
    } finally {
      setEnteringAdmin(false);
    }
  }

  useEffect(() => {
    if (!embedded) return; // เช็คเฉพาะใน widget

    let alive = true;

    async function checkAdmin() {
      try {
        const { r, j } = await fetchAuthWithFallback();
        if (!alive) return;

        setCanSeeAdmin(!!(r.ok && j?.ok && j?.isAdmin));
      } catch {
        if (!alive) return;
        setCanSeeAdmin(false);
      }
    }

    checkAdmin();

    return () => {
      alive = false;
    };
  }, [embedded]);

  // Persist messages ทุกครั้งที่เปลี่ยน
  useEffect(() => {
    saveHistory(sessionId, messages);
  }, [sessionId, messages]);

  function startNewChat() {
    localStorage.removeItem(historyKey(sessionId));
    localStorage.removeItem(SESSION_KEY);
    setMessages([]);
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
      const history = nextMessages.map((x) => ({
        role: x.role,
        content: x.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          conversation_id: sessionId,
          message: content,
          history,
          meta: { tz: "Asia/Bangkok", client: "nextjs-app-router" },
        }),
      });

      const data = await res.json().catch(() => ({}) as any);
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
            <div
              className="text-base font-extrabold"
              style={{ color: "var(--text)" }}
            >
              น้องใส่ใจ
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin Sessions (แสดงเฉพาะใน Widget) */}
            {embedded && canSeeAdmin && (
              <button
                type="button"
                onClick={enterAdmin}
                disabled={enteringAdmin}
                title="Admin Sessions"
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-extrabold"
                style={{
                  border: "1px solid var(--border)",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "white",
                  textDecoration: "none",
                  opacity: enteringAdmin ? 0.7 : 1,
                  cursor: enteringAdmin ? "not-allowed" : "pointer",
                }}
              >
                <Shield className="h-3.5 w-3.5" />
                {enteringAdmin ? "Entering…" : "Admin"}
              </button>
            )}

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
          </div>
        </div>
      </header>

      <MessageList messages={messages} pending={pending} />
      <Composer onSend={send} disabled={pending} />
    </div>
  );
}
