// app/chat/embed/page.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";

const ChatShellNoSSR = dynamic(() => import("@/components/chat/ChatShell"), {
  ssr: false,
});

type AuthState = "idle" | "loading" | "ok" | "error";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// ✅ เพิ่ม UAT origins
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://uat-msync.mfec.co.th",
  "https://msync.mfec.co.th",
]);

// ✅ เก็บ token แบบชั่วคราวใน iframe (sessionStorage) เพื่อใช้ Bearer fallback
const TOKEN_KEY = "nsj_bearer_token";

async function exchangeToken(token: string) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown" }));
    throw new Error(err.error || "auth_failed");
  }

  return res.json();
}

export default function ChatEmbedPage() {
  const [ready, setReady] = React.useState<boolean>(false);
  const [authState, setAuthState] = React.useState<AuthState>("idle");
  const [errorMsg, setErrorMsg] = React.useState<string>("");

  React.useEffect(() => {
    setReady(true);

    const handleMessage = async (ev: MessageEvent) => {
      if (!ALLOWED_ORIGINS.has(ev.origin)) return;

      const { type, token } = ev.data || {};
      if (type !== "NSJ_TOKEN") return;

      if (!token || typeof token !== "string" || token.length < 10) {
        setAuthState("error");
        setErrorMsg("ไม่พบ Token หรือ Token ไม่ถูกต้อง");

        try {
          (ev.source as Window | null)?.postMessage(
            { type: "NSJ_AUTH_ERROR", data: "invalid_token" },
            ev.origin
          );
        } catch {}

        return;
      }

      try {
        setAuthState("loading");
        setErrorMsg("");

        await exchangeToken(token);

        // ✅ เก็บ token ไว้ใช้ Bearer fallback ใน iframe (กัน cookie โดนบล็อก)
        try {
          sessionStorage.setItem(TOKEN_KEY, token);
        } catch {}

        setAuthState("ok");

        try {
          window.parent.postMessage({ type: "NSJ_AUTH_OK" }, ev.origin);
        } catch {}
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "เกิดข้อผิดพลาด";
        setAuthState("error");
        setErrorMsg(errorMessage);

        // ✅ ถ้า auth fail ให้ลบ token ที่เก็บไว้
        try {
          sessionStorage.removeItem(TOKEN_KEY);
        } catch {}

        try {
          window.parent.postMessage(
            { type: "NSJ_AUTH_ERROR", data: errorMessage },
            ev.origin
          );
        } catch {}
      }
    };

    window.addEventListener("message", handleMessage);

    // ✅ บอก parent ว่า iframe พร้อมรับ token แล้ว
    try {
      window.parent.postMessage({ type: "NSJ_EMBED_READY" }, "*");
    } catch {}

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!ready) return null;

  return (
    <main
      style={{
        height: "100vh",
        width: "100vw",
        margin: 0,
        padding: 0,
        background: "var(--card, #fff)",
      }}
    >
      {authState === "loading" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            fontFamily: "system-ui, sans-serif",
            color: "#666",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 24 }}>🔄</div>
          <div>กำลังตรวจสอบสิทธิ์...</div>
        </div>
      )}

      {authState === "error" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            fontFamily: "system-ui, sans-serif",
            color: "#e11d48",
            gap: 12,
            padding: 20,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48 }}>❌</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            ไม่สามารถเข้าสู่ระบบได้
          </div>
          <div style={{ fontSize: 14, color: "#666" }}>{errorMsg}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}

      {(authState === "ok" || authState === "idle") && <ChatShellNoSSR embedded />}
    </main>
  );
}
