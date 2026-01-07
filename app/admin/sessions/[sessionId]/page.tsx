import Link from "next/link";

type Session = any;

type Message = {
  id: string;
  sender: "USER" | "AI" | string;
  message_text: string;
  timestamp: string;
};

async function fetchSession(sessionId: string) {
  const res = await fetch(`http://localhost:3000/api/admin/sessions/${sessionId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).session as Session;
}

async function fetchMessages(sessionId: string) {
  const res = await fetch(`http://localhost:3000/api/admin/sessions/${sessionId}/messages`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).items as Message[];
}

function fmtDT(v?: string | null) {
  if (!v) return "-";
  try {
    // stable across SSR/Client (avoid toLocaleString mismatch)
    return new Date(v).toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return String(v);
  }
}

function Pill({
  text,
  tone,
}: {
  text: string;
  tone: "red" | "yellow" | "green" | "gray" | "blue";
}) {
  const map: Record<string, { bg: string; fg: string; bd: string }> = {
    red: { bg: "rgba(239,68,68,0.15)", fg: "#fecaca", bd: "rgba(239,68,68,0.35)" },
    yellow: { bg: "rgba(245,158,11,0.15)", fg: "#fde68a", bd: "rgba(245,158,11,0.35)" },
    green: { bg: "rgba(34,197,94,0.15)", fg: "#bbf7d0", bd: "rgba(34,197,94,0.35)" },
    blue: { bg: "rgba(59,130,246,0.15)", fg: "#bfdbfe", bd: "rgba(59,130,246,0.35)" },
    gray: { bg: "rgba(148,163,184,0.12)", fg: "var(--text)", bd: "rgba(148,163,184,0.25)" },
  };
  const c = map[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${c.bd}`,
        background: c.bg,
        color: c.fg,
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function toneForStatus(s?: string | null) {
  if (s === "RISK") return "red";
  if (s === "CONCERN") return "yellow";
  if (s === "NON_RISK") return "green";
  return "gray";
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        background: "var(--card)",
        borderRadius: 14,
        padding: 16,
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 950, color: "var(--text)" }}>{title}</div>
        <div style={{ marginLeft: "auto" }}>{right}</div>
      </div>
      {children}
    </div>
  );
}

function prettyRiskScores(scores: any) {
  if (!scores || typeof scores !== "object") return [];
  return Object.keys(scores).map((k) => ({
    key: k,
    score: scores?.[k]?.score ?? null,
    text: scores?.[k]?.text ?? null,
  }));
}

export default async function AdminSessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  // IMPORTANT (Next 16.1): params is Promise
  const { sessionId } = await params;

  const [session, messages] = await Promise.all([fetchSession(sessionId), fetchMessages(sessionId)]);

  const status = (session?.effective_status as string | null) ?? null;
  const category = (session?.effective_primary_category as string | null) ?? null;

  const scoreItems = prettyRiskScores(session?.ai_risk_scores);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 20% -10%, var(--bg-grad-1), transparent 55%), radial-gradient(900px 500px at 90% 10%, var(--bg-grad-2), transparent 60%), var(--bg)",
        color: "var(--text)",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Link href="/admin/sessions" style={{ color: "var(--muted)", textDecoration: "none", fontWeight: 900 }}>
          ← Back to Sessions
        </Link>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: 14, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>
              Project Code{" "}
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {session?.proj_code ?? "-"}
              </span>
            </div>
            <div style={{ marginTop: 4, color: "var(--muted)" }}>
              Created: <b style={{ color: "var(--text)" }}>{fmtDT(session?.session_created_at)}</b>
        
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Pill text={`Effective: ${status ?? "-"}`} tone={toneForStatus(status)} />
            <Pill text={`Category: ${category ?? "-"}`} tone="gray" />
            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 800 }}>
              AI: {session?.ai_status ?? "-"} / {session?.ai_primary_category ?? "-"}
            </span>
          </div>
        </div>

        {/* Layout: Left (assessment) / Right (controls) */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
          <Card title="AI Summary">
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: "var(--text)" }}>
              {session?.ai_summary ?? "-"}
            </div>
          </Card>

          <Card
            title="Manual Override"
            right={
              session?.has_override ? (
                <Pill text="Override ACTIVE" tone="yellow" />
              ) : (
                <Pill text="AI-only" tone="gray" />
              )
            }
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["RISK", "CONCERN", "NON_RISK"] as const).map((s) => (
                <form key={s} action={`/api/admin/sessions/${sessionId}/override`} method="post">
                  <input type="hidden" name="status" value={s} />
                  <button
                    type="submit"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: status === s ? "rgba(59,130,246,0.15)" : "var(--card2)",
                      color: "var(--text)",
                      fontWeight: 950,
                      cursor: "pointer",
                      minWidth: 120,
                    }}
                  >
                    {s}
                  </button>
                </form>
              ))}
            </div>

            
          </Card>
        </div>

        {/* Scores + Conversation */}
        <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 16, marginTop: 16 }}>
          <Card title="Risk Scores">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {scoreItems.length === 0 ? (
                <div style={{ color: "var(--muted)" }}>-</div>
              ) : (
                scoreItems.map((it) => (
                  <div
                    key={it.key}
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--card2)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          fontWeight: 950,
                          textTransform: "uppercase",
                          fontSize: 12,
                          letterSpacing: 0.6,
                          color: "var(--muted)",
                        }}
                      >
                        {it.key.replace("risk_", "").replaceAll("_", " ")}
                      </div>
                      <div style={{ marginLeft: "auto" }}>
                        <Pill text={`score: ${it.score ?? "-"}`} tone="gray" />
                      </div>
                    </div>

                    {it.text ? (
                      <div style={{ marginTop: 8, color: "var(--text)", lineHeight: 1.5 }}>{it.text}</div>
                    ) : (
                      <div style={{ marginTop: 8, color: "var(--muted)" }}>ไม่มีข้อความอธิบาย</div>
                    )}
                  </div>
                ))
              )}

              <details style={{ marginTop: 4 }}>
                <summary style={{ cursor: "pointer", color: "var(--muted)", fontWeight: 900 }}>
                  ดู JSON ทั้งก้อน
                </summary>
                <pre
                  style={{
                    marginTop: 10,
                    background: "var(--card2)",
                    border: "1px solid var(--border)",
                    padding: 12,
                    borderRadius: 12,
                    overflowX: "auto",
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                >
                  {JSON.stringify(session?.ai_risk_scores ?? {}, null, 2)}
                </pre>
              </details>
            </div>
          </Card>

          <Card title="Conversation">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map((m) => {
                const isUser = m.sender === "USER";
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: isUser ? "flex-start" : "flex-end" }}>
                    <div
                      style={{
                        maxWidth: "78%",
                        borderRadius: 14,
                        padding: 12,
                        border: "1px solid var(--border)",
                        background: isUser ? "var(--card2)" : "rgba(59,130,246,0.14)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 6 }}>
                        <span style={{ fontWeight: 950, fontSize: 12, color: "var(--text)" }}>
                          {isUser ? "USER" : "AI"}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>
                          {fmtDT(m.timestamp)}
                        </span>
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, color: "var(--text)" }}>
                        {m.message_text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
