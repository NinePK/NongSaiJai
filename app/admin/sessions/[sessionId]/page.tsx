//app/admin/sessions/[sessionId]/page.tsx
import Link from "next/link";
import { OverrideButtons } from "./OverrideButtons";
import { pool } from "@/lib/db";
import { ProjCodeBlock } from "./ProjCodeBlock";
import { ProjectInfoCard } from "./ProjectInfoCard";
import { ConcernNonRiskCard } from "./ConcernNonRiskCard";

type Session = any;
type Message = {
  id: string;
  sender: "USER" | "AI" | string;
  message_text: string;
  timestamp: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const fetchSession = async (sessionId: string) => {
  const res = await fetch(`${BASE_URL}/api/admin/sessions/${sessionId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).session as Session;
};

const fetchMessages = async (sessionId: string) => {
  const res = await fetch(
    `${BASE_URL}/api/admin/sessions/${sessionId}/messages`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).items as Message[];
};

const markAdminOpened = async (sessionId: string) => {
  await pool.query(
    `UPDATE public.ai_chat_sessions SET is_admin_opened = true WHERE id = $1::uuid AND is_admin_opened = false`,
    [sessionId],
  );
};

const fmtDT = (v?: string | null) => {
  if (!v) return "-";
  try {
    return new Date(v).toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return String(v);
  }
};

const TONE_COLORS = {
  red: {
    bg: "rgba(239,68,68,0.15)",
    fg: "#b91c1c",
    bd: "rgba(239,68,68,0.35)",
  },
  yellow: {
    bg: "var(--badge-yellow-bg)",
    fg: "#a69119",
    bd: "var(--badge-yellow-bd)",
  },
  green: {
    bg: "rgba(34,197,94,0.15)",
    fg: "#2d613f",
    bd: "rgba(34,197,94,0.35)",
  },
  blue: {
    bg: "rgba(59,130,246,0.15)",
    fg: "#bfdbfe",
    bd: "rgba(59,130,246,0.35)",
  },
  gray: {
    bg: "rgba(148,163,184,0.12)",
    fg: "var(--text)",
    bd: "rgba(148,163,184,0.25)",
  },
};

const getToneColor = (tone: string) =>
  TONE_COLORS[tone as keyof typeof TONE_COLORS] || TONE_COLORS.gray;

const statusToTone = (status?: string | null) => {
  if (status === "ISSUE" || status === "RISK") return "red";
  if (status === "CONCERN") return "yellow";
  if (status === "NON_RISK") return "green";
  return "gray";
};
const statusToLabel = (status?: string | null) => {
  if (status === "NON_RISK") return "Informational – No Risk";
  return status ?? "-";
};

const getStarTone = (score: number, isLight: boolean) => {
  if (isLight) {
    if (score >= 4) return { fg: "#b91c1c", bg: "#fee2e2", bd: "#fca5a5" };
    if (score === 3)
      return {
        fg: "#7a4a00",
        bg: "rgba(255,233,179,0.55)",
        bd: "rgba(217,119,6,0.35)",
      };
    return { fg: "#334155", bg: "#f1f5f9", bd: "#cbd5e1" };
  }
  if (score >= 4)
    return {
      fg: "#b91c1c",
      bg: "rgba(239,68,68,0.16)",
      bd: "rgba(239,68,68,0.35)",
    };
  if (score === 3)
    return {
      fg: "#ccad2f",
      bg: "rgba(245,158,11,0.16)",
      bd: "rgba(245,158,11,0.35)",
    };
  return {
    fg: "var(--text)",
    bg: "rgba(148,163,184,0.12)",
    bd: "rgba(148,163,184,0.26)",
  };
};

const prettyRiskScores = (scores: any) => {
  if (!scores || typeof scores !== "object") return [];
  return Object.keys(scores).map((k) => ({
    key: k,
    score: scores[k]?.score ?? null,
    text: scores[k]?.text ?? null,
  }));
};

const Pill = ({
  text,
  tone,
}: {
  text: string;
  tone: keyof typeof TONE_COLORS;
}) => {
  const c = getToneColor(tone);
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
};

const StarScore = ({ score }: { score: number | null | undefined }) => {
  const n = Math.max(1, Math.min(5, Number(score ?? 1)));
  const isLight =
    typeof window !== "undefined" &&
    document.documentElement.getAttribute("data-theme") !== "dark";
  const tone = getStarTone(n, isLight);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${tone.bd}`,
        background: tone.bg,
        color: tone.fg,
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: 0.3,
      }}
      title={`Risk score: ${n}/5`}
    >
      {"★".repeat(n)}
      <span style={{ opacity: 0.35 }}>{"☆".repeat(5 - n)}</span>
    </span>
  );
};

const Card = ({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div
    style={{
      border: "1px solid var(--border)",
      background: "var(--card)",
      borderRadius: 14,
      padding: 16,
      boxShadow: "var(--shadow)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 950, color: "var(--text)" }}>
        {title}
      </div>
      <div style={{ marginLeft: "auto" }}>{right}</div>
    </div>
    {children}
  </div>
);

const RiskScoreItem = ({
  item,
}: {
  item: { key: string; score: number | null; text: string | null };
}) => (
  <div
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
        {item.key.replace("risk_", "").replaceAll("_", " ")}
      </div>
      <div style={{ marginLeft: "auto" }}>
        <StarScore score={item.score} />
      </div>
    </div>
    <div
      style={{
        marginTop: 8,
        color: item.text ? "var(--text)" : "var(--muted)",
        lineHeight: 1.5,
      }}
    >
      {item.text || "ไม่มีข้อความอธิบาย"}
    </div>
  </div>
);

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.sender === "USER";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-start" : "flex-end",
      }}
    >
      <div
        style={{
          maxWidth: "78%",
          borderRadius: 14,
          padding: 12,
          border: "1px solid var(--border)",
          background: isUser ? "var(--card2)" : "rgba(59,130,246,0.14)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "baseline",
            marginBottom: 6,
          }}
        >
          <span style={{ fontWeight: 950, fontSize: 12, color: "var(--text)" }}>
            {isUser ? "USER" : "AI"}
          </span>
          <span
            style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}
          >
            {fmtDT(message.timestamp)}
          </span>
        </div>
        <div
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.55,
            color: "var(--text)",
          }}
        >
          {message.message_text}
        </div>
      </div>
    </div>
  );
};

export default async function AdminSessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  await markAdminOpened(sessionId);

  const [session, messages] = await Promise.all([
    fetchSession(sessionId),
    fetchMessages(sessionId),
  ]);

  const status = session?.effective_status ?? null;
  const category = session?.effective_primary_category ?? null;
  const aiTitle = session?.ai_title ?? "";
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
        <Link
          href="/admin/sessions"
          style={{
            color: "var(--muted)",
            textDecoration: "none",
            fontWeight: 900,
          }}
        >
          ← Back to Sessions
        </Link>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 16,
            marginTop: 14,
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 950,
                color: "var(--text-strong)",
                lineHeight: 1.15,
              }}
            >
              {aiTitle?.trim() || "—"}
            </div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900 }}>
              <ProjCodeBlock
                sessionId={sessionId}
                initialProjCode={session?.proj_code ?? null}
              />
            </div>
            <div style={{ marginTop: 4, color: "var(--muted)" }}>
              Created:{" "}
              <b style={{ color: "var(--text)" }}>
                {fmtDT(session?.session_created_at)}
              </b>
            </div>
          </div>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Pill
              text={`Effective: ${statusToLabel(status)}`}
              tone={statusToTone(status)}
            />
            <Pill text={`Category: ${category ?? "-"}`} tone="gray" />
          </div>
        </div>

        {/* Summary + Override */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 16,
          }}
        >
          <Card title="AI Summary">
            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                color: "var(--text)",
              }}
            >
              {session?.ai_summary ?? "-"}
            </div>
          </Card>

          <Card
            title="Manual Override"
            right={
              session?.has_override ? (
                <Pill text="มีการตรวจจาก Admin แล้ว" tone="yellow" />
              ) : (
                <Pill text="เป็นการประเมินของ AI" tone="gray" />
              )
            }
          >
            <OverrideButtons
              sessionId={sessionId}
              currentStatus={status}
              projectCode={session?.proj_code ?? ""}
              aiTitle={aiTitle}
              aiSummary={session?.ai_summary ?? ""}
            />
          </Card>
        </div>

        {/* Risk Scores + Conversation */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.9fr 1.1fr",
            gap: 16,
            marginTop: 16,
            alignItems: "start",
          }}
        >
          {/* LEFT: Risk Scores + Project Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card title="Risk Scores">
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {scoreItems.length === 0 ? (
                  <div style={{ color: "var(--muted)" }}>-</div>
                ) : (
                  scoreItems.map((item) => (
                    <RiskScoreItem key={item.key} item={item} />
                  ))
                )}
              </div>
            </Card>

            <ProjectInfoCard projCode={session?.proj_code ?? null} />
            <ConcernNonRiskCard
              effectiveStatus={status}
              hasOverride={!!session?.has_override}
              overrideNotes={session?.override_notes ?? null}
              overriddenAt={session?.overridden_at ?? null}
            />
          </div>

          {/* RIGHT: Conversation */}
          <Card title="Conversation">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
