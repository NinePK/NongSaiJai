import Link from "next/link";

type SessionRow = {
  session_id: string;
  proj_code: string | null;

  effective_status: string | null;
  effective_primary_category: string | null;

  ai_status: string | null;
  ai_primary_category: string | null;

  has_override: boolean;
  overridden_at: string | null;

  last_message_at: string | null;
  last_message_snippet: string | null;
};

type KPI = {
  total: number;
  normal: number;
  concern: number;
  risk: number;
  high: number;
  mid: number;
  low: number;
};

async function fetchSessions(q: string, status: string) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (status) sp.set("status", status);
  sp.set("limit", "50");

  const res = await fetch(`http://localhost:3000/api/admin/sessions?${sp.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { items: SessionRow[] };
}

async function fetchSummary(q: string, status: string) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (status) sp.set("status", status);

  const res = await fetch(`http://localhost:3000/api/admin/sessions/summary?${sp.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { ok: boolean; kpi: KPI };
}

function Badge({
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
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${c.bd}`,
        background: c.bg,
        color: c.fg,
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: 0.25,
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

function fmtDT(v: string | null | undefined) {
  if (!v) return "-";
  try {
    const d = new Date(v);
    return d.toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return String(v);
  }
}

/* =========================
   Dashboard (SSR-only, no libs)
========================= */
function BarRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", gap: 10, alignItems: "center" }}>
      <div style={{ color: "var(--muted)", fontWeight: 900, fontSize: 12 }}>{label}</div>
      <div style={{ height: 10, borderRadius: 999, border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "rgba(59,130,246,0.35)" }} />
      </div>
      <div style={{ textAlign: "right", fontWeight: 900, fontSize: 12 }}>{value}</div>
    </div>
  );
}

function Dashboard({ kpi }: { kpi: KPI }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        background: "var(--card)",
        borderRadius: 14,
        padding: 16,
        boxShadow: "var(--shadow)",
        marginBottom: 14,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 12 }}>Dashboard</div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 14 }}>
        {[
          { label: "โครงการทั้งหมด", value: kpi.total },
          { label: "มีความเสี่ยง", value: kpi.risk },
          { label: "ควรติดตาม", value: kpi.concern },
          { label: "ปกติ", value: kpi.normal },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              border: "1px solid var(--border)",
              background: "var(--card2)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ color: "var(--muted)", fontWeight: 900, fontSize: 12 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 950, marginTop: 6 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Bars */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ border: "1px solid var(--border)", background: "var(--card2)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>สถานะภาพรวม</div>
          <BarRow label="มีความเสี่ยง" value={kpi.risk} total={kpi.total} />
          <div style={{ height: 8 }} />
          <BarRow label="ควรติดตาม" value={kpi.concern} total={kpi.total} />
          <div style={{ height: 8 }} />
          <BarRow label="ปกติ" value={kpi.normal} total={kpi.total} />
        </div>

        <div style={{ border: "1px solid var(--border)", background: "var(--card2)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>ระดับความเสี่ยง</div>
          <BarRow label="สูง" value={kpi.high} total={kpi.total} />
          <div style={{ height: 8 }} />
          <BarRow label="กลาง" value={kpi.mid} total={kpi.total} />
          <div style={{ height: 8 }} />
          <BarRow label="ต่ำ" value={kpi.low} total={kpi.total} />
        </div>
      </div>
    </div>
  );
}

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const status = (searchParams.status ?? "").trim();

  const [data, summary] = await Promise.all([fetchSessions(q, status), fetchSummary(q, status)]);

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
        {/* Back to Chat */}
        <div style={{ position: "fixed", left: 16, top: 16, zIndex: 50 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              fontWeight: 900,
              textDecoration: "none",
              boxShadow: "var(--shadow)",
              backdropFilter: "blur(6px)",
            }}
          >
            ← Back to Chat
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>Admin – Sessions</div>
            <div style={{ marginTop: 6, color: "var(--muted)" }}>
              รายการบทสนทนาที่ AI ประเมินแล้ว · คลิกเพื่อดูรายละเอียดและ override
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <Badge text={`Total: ${data.items.length}`} tone="blue" />

            <a
              href={`/api/admin/export/executive?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(16,185,129,0.15)",
                color: "var(--text)",
                fontWeight: 900,
                textDecoration: "none",
                boxShadow: "var(--shadow)",
                whiteSpace: "nowrap",
              }}
            >
              Export รายงานผู้บริหาร
            </a>
          </div>
        </div>

        {/* Dashboard */}
        {summary?.ok ? <Dashboard kpi={summary.kpi} /> : null}

        {/* Filters */}
        <form
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="ค้นหา session_id / proj_code"
            style={{
              flex: "1 1 320px",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--card2)",
              color: "var(--text)",
              outline: "none",
            }}
          />

          <select
            name="status"
            defaultValue={status}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--card2)",
              color: "var(--text)",
              outline: "none",
            }}
          >
            <option value="">All status</option>
            <option value="RISK">RISK</option>
            <option value="CONCERN">CONCERN</option>
            <option value="NON_RISK">NON_RISK</option>
          </select>

          <button
            type="submit"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--card2)",
              color: "var(--text)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Filter
          </button>

          <Link
            href="/admin/sessions"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--muted)",
              fontWeight: 800,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Reset
          </Link>
        </form>

        {/* Table/Card list */}
        <div
          style={{
            border: "1px solid var(--border)",
            background: "var(--card)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "var(--shadow)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "220px 220px 1fr 150px",
              gap: 12,
              padding: 14,
              background: "var(--card2)",
              borderBottom: "1px solid var(--border)",
              fontWeight: 900,
              color: "var(--text)",
              fontSize: 12,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            <div>Session</div>
            <div>Status</div>
            <div>Last message</div>
            <div style={{ textAlign: "right" }}>Action</div>
          </div>

          {data.items.length === 0 ? (
            <div style={{ padding: 16, color: "var(--muted)" }}>No sessions</div>
          ) : (
            data.items.map((s) => (
              <div
                key={s.session_id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 220px 1fr 150px",
                  gap: 12,
                  padding: 14,
                  borderBottom: "1px solid var(--border)",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                    {s.session_id.slice(0, 8)}…
                  </div>
                  <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 12 }}>{s.proj_code ?? "-"}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Badge text={`Effective: ${s.effective_status ?? "-"}`} tone={toneForStatus(s.effective_status)} />
                    {s.has_override ? <Badge text="Override" tone="blue" /> : <Badge text="AI-only" tone="gray" />}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {s.effective_primary_category ?? "-"}{" "}
                    <span style={{ color: "var(--muted)" }}>
                      · AI: {s.ai_status ?? "-"} / {s.ai_primary_category ?? "-"}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{fmtDT(s.last_message_at)}</div>
                  <div style={{ marginTop: 6, lineHeight: 1.5, color: "var(--text)" }}>
                    {s.last_message_snippet ?? ""}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <Link
                    href={`/admin/sessions/${s.session_id}`}
                    style={{
                      display: "inline-flex",
                      justifyContent: "center",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card2)",
                      color: "var(--text)",
                      fontWeight: 900,
                      textDecoration: "none",
                      minWidth: 120,
                    }}
                  >
                    View
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 12 }}>
        </div>
      </div>
    </div>
  );
}
