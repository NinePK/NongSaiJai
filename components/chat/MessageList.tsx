"use client";

import { Bot, User } from "lucide-react";

export type ChatRole = "user" | "assistant" | "system";
export type ChatMessage = { id: string; role: ChatRole; content: string };

type Props = { messages: ChatMessage[]; pending: boolean };

export default function MessageList({ messages, pending }: Props) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6 chat-scroll">
      {messages.length === 0 && (
        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={{
            border: "1px solid var(--border)",
            background: "var(--card2)",
            color: "var(--muted)",
          }}
        >
          พิมพ์สิ่งที่อยากระบายได้เลย ระบบจะตอบกลับและช่วยสะท้อนภาพรวมให้
        </div>
      )}

      {messages.map((m) => {
        const isUser = m.role === "user";

        const bubbleStyle: React.CSSProperties = isUser
          ? {
              border: "1px solid var(--border)",
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.95), rgba(168,85,247,0.95))",
              color: "white",
            }
          : {
              border: "1px solid var(--border)",
              background: "var(--card2)",
              color: "var(--text)",
            };

        const avatarStyle: React.CSSProperties = {
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--muted)",
        };

        return (
          <div
            key={m.id}
            className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
          >
            {!isUser && (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={avatarStyle}
              >
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className="max-w-[78%] rounded-3xl px-4 py-3 text-sm leading-relaxed"
              style={bubbleStyle}
            >
              {m.content}
            </div>

            {isUser && (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={avatarStyle}
              >
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        );
      })}

      {pending && (
        <div className="flex items-end gap-2 justify-start">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--muted)",
            }}
          >
            <Bot className="h-4 w-4" />
          </div>
          <div
            className="rounded-3xl px-4 py-3 text-sm"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card2)",
              color: "var(--muted)",
            }}
          >
            กำลังตอบ…
          </div>
        </div>
      )}
    </div>
  );
}
