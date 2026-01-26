// app/chat/embed/page.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";

const ChatShellNoSSR = dynamic(() => import("@/components/chat/ChatShell"), {
  ssr: false,
});

type AuthState = "idle" | "loading" | "ok" | "error";

// ✅ ใช้ ENV
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ;

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://10.6.100.128:3002/",
  "https://uat-msync.mfec.co.th/",
  "https://msync.mfec.co.th", // เพิ่ม production origin
]);

async function exchangeToken(token: string) {
  // ✅ ใช้ relative path ก็ได้ เพราะอยู่ใน Next.js เดียวกัน
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

      if (!ALLOWED_ORIGINS.has(ev.origin)) {
        console.warn("❌ ปฏิเสธ origin:", ev.origin);
        console.warn("✅ origins ที่อนุญาต:", Array.from(ALLOWED_ORIGINS));
        return;
      }

      const { type, token } = ev.data || {};

      if (!token || typeof token !== "string" || token.length < 10) {
        console.error("❌ Token ไม่ถูกต้อง");
        setAuthState("error");
        setErrorMsg("ไม่พบ Token หรือ Token ไม่ถูกต้อง");
        
        if (ev.source && "postMessage" in ev.source) {
          (ev.source as Window).postMessage(
            { type: "NSJ_AUTH_ERROR", data: "invalid_token" },
            ev.origin
          );
        }
        return;
      }

      try {
        console.log("🔄 กำลังแลก token...");
        setAuthState("loading");
        setErrorMsg("");

        const result = await exchangeToken(token);
        console.log("✅ แลก token สำเร็จ:", result);

        setAuthState("ok");

        window.parent.postMessage(
          { type: "NSJ_AUTH_OK" },
          ev.origin
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "เกิดข้อผิดพลาด";
        console.error("❌ แลก token ล้มเหลว:", e);
        setAuthState("error");
        setErrorMsg(errorMessage);

        window.parent.postMessage(
          { type: "NSJ_AUTH_ERROR", data: errorMessage },
          ev.origin
        );
      }
    };

    window.addEventListener("message", handleMessage);

    window.parent.postMessage({ type: "NSJ_EMBED_READY" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!ready) return null;

  return (
    <main style={{ 
      height: "100vh", 
      width: "100vw", 
      margin: 0, 
      padding: 0,
      background: "var(--card, #fff)"
    }}>


      {authState === "loading" && (
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          height: "100vh",
          fontFamily: "system-ui, sans-serif",
          color: "#666",
          flexDirection: "column",
          gap: 12
        }}>
          <div style={{ fontSize: 24 }}>🔄</div>
          <div>กำลังตรวจสอบสิทธิ์...</div>
        </div>
      )}

      {authState === "error" && (
        <div style={{ 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center", 
          justifyContent: "center", 
          height: "100vh",
          fontFamily: "system-ui, sans-serif",
          color: "#e11d48",
          gap: 12,
          padding: 20,
          textAlign: "center"
        }}>
          <div style={{ fontSize: 48 }}>❌</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            ไม่สามารถเข้าสู่ระบบได้
          </div>
          <div style={{ fontSize: 14, color: "#666" }}>
            {errorMsg}
          </div>
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
              fontSize: 14
            }}
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}

      {(authState === "ok" || authState === "idle") && (
        <ChatShellNoSSR embedded />
      )}
    </main>
  );
}