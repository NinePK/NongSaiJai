"use client";

import { useEffect, useState } from "react";
import ChatWidget from "@/components/chat/ChatWidget";

function getHashParam(name: string) {
  // hash like: "#access_token=...&token_type=bearer&expires_in=..."
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  const s = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(s);
  return params.get(name);
}

export default function Page() {
  const [token, setToken] = useState<string | null>(null);
  const [userBody, setUserBody] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1) try localStorage first
    let t = localStorage.getItem("access_token");

    // 2) if missing, try URL hash
    if (!t) {
      const fromHash = getHashParam("access_token");
      if (fromHash) {
        t = fromHash;
        localStorage.setItem("access_token", fromHash);

        // optional: clean the URL (remove token from address bar)
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    setToken(t);

    // 3) fetch user if we have token
    if (!t) return;

    fetch("https://hadbapi.mfec.co.th/auth/v1/user", {
      method: "GET",
      headers: {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE", // DEV only
        Authorization: `Bearer ${t}`,
      },
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}: ${txt}`);
        }
        return res.json();
      })
      .then((json) => setUserBody(json))
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="portal-theme portal-bg relative min-h-screen overflow-hidden p-6 space-y-6">
      {/* DEV DEBUG PANEL */}
      <section
        style={{
          background: "#0f172a",
          color: "#e5e7eb",
          padding: 16,
          borderRadius: 12,
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 10 }}>DEV DEBUG (temporary)</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600 }}>Access Token</div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              background: "#020617",
              padding: 10,
              borderRadius: 8,
              maxHeight: 120,
              overflow: "auto",
            }}
          >
            {token ?? "— no token —"}
          </pre>
        </div>

        <div>
          <div style={{ fontWeight: 600 }}>User Body</div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#020617",
              padding: 10,
              borderRadius: 8,
              maxHeight: 260,
              overflow: "auto",
            }}
          >
            {error
              ? `ERROR: ${error}`
              : userBody
              ? JSON.stringify(userBody, null, 2)
              : "— no data —"}
          </pre>
        </div>
      </section>

      <ChatWidget />
    </main>
  );
}
