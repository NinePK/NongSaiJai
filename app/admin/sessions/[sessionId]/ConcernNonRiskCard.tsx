// app/admin/sessions/[sessionId]/ConcernNonRiskCard.tsx
import * as React from "react";
import { Badge } from "@/components/ui/badge";

type Props = {
  effectiveStatus: "CONCERN" | "NON_RISK" | "RISK" | "ISSUE" | string | null;
  hasOverride: boolean;
  overrideNotes: string | null;
  overriddenAt: string | null;
};

function safeJson<T = any>(raw: any): T | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as T;
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function fmtDT(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 900 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 15,
          fontWeight: 950,
          color: "var(--text)",
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
        }}
      >
        {value ?? "-"}
      </div>
    </div>
  );
}

function pillTone(status: "CONCERN" | "NON_RISK") {
  // ใช้ Badge variant เดิมของคุณ แต่เพิ่มสีพื้นหลังแบบ inline ให้คุมโทนง่าย
  if (status === "CONCERN") {
    return {
      background: "rgba(245, 158, 11, 0.14)",
      border: "1px solid rgba(245, 158, 11, 0.25)",
      color: "var(--text)",
    };
  }
  return {
    background: "rgba(34, 197, 94, 0.14)",
    border: "1px solid rgba(34, 197, 94, 0.25)",
    color: "var(--text)",
  };
}
function buildOutlookCompose(to: string, subject?: string, body?: string) {
  const qs: string[] = [];

  qs.push(`to=${encodeURIComponent(to)}`);

  if (subject) {
    qs.push(`subject=${encodeURIComponent(subject)}`);
  }

  if (body) {
    qs.push(`body=${encodeURIComponent(body)}`);
  }

  return `https://outlook.office.com/mail/deeplink/compose?${qs.join("&")}`;
}
function buildOutlookComposeMany(
  tos: string[],
  subject?: string,
  body?: string,
) {
  const to = tos.filter(Boolean).join(";"); // Outlook รองรับคั่นด้วย ;
  return buildOutlookCompose(to, subject, body);
}
function getConcernTargets(notes: any): any[] {
  if (!notes || typeof notes !== "object") return [];

  // ใหม่: targets เป็น array
  if (Array.isArray(notes.targets)) return notes.targets.filter(Boolean);

  // เก่า: target เดี่ยว
  if (notes.target && typeof notes.target === "object") return [notes.target];

  return [];
}

function formatConcernTarget(notes: any): React.ReactNode {
  const targets = getConcernTargets(notes);
  if (!targets.length) return "-";

  // ถ้าไม่ใช่ BACKOFFICE (เช่น scope อื่น) แสดง label รวม
  const nonBackoffice = targets.filter((t) => t?.scope !== "BACKOFFICE");
  if (nonBackoffice.length) {
    return (
      <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 10 }}>
        {targets.map((t, idx) => (
          <span key={idx} style={{ fontWeight: 950 }}>
            {t?.label || t?.scope || "-"}
          </span>
        ))}
      </span>
    );
  }

  // BACKOFFICE: สร้างรายการทีม + email
  const items = targets.map((t, idx) => {
    const team = t.team_label || t.team_code || "Backoffice";
    const email = (t.group_mail || "").trim();

    if (!email) {
      return (
        <span key={idx} style={{ fontWeight: 950 }}>
          {team}
        </span>
      );
    }

    const subject = `[น้องใส่ใจ] แจ้งประเด็น CONCERN ถึงทีม ${team}`;
    const body =
      `สวัสดีครับ/ค่ะ\n\n` +
      `ขอแจ้งประเด็น CONCERN เพื่อให้ช่วยตรวจสอบและติดตาม\n\n` +
      `ทีมที่เกี่ยวข้อง: ${team}\n\n` +
      `รายละเอียด/บริบทเพิ่มเติม:\n(กรอกเพิ่มได้ที่นี่)\n\n` +
      `ขอบคุณครับ/ค่ะ\n`;

    const href = buildOutlookCompose(email, subject, body);

    return (
      <span
        key={idx}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 950 }}>{team}</span>
        <span style={{ color: "var(--muted)" }}>•</span>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "var(--corp-blue-1)",
            textDecoration: "underline",
            fontWeight: 950,
          }}
          title="เปิดหน้าเขียนอีเมลใน Outlook"
        >
          {email}
        </a>
      </span>
    );
  });

  // ปุ่ม “ส่งเมลรวม” (To = ทุกทีม)
  const allEmails = targets
    .map((t) => (t?.group_mail || "").trim())
    .filter(Boolean);

  const allHref =
    allEmails.length >= 2
      ? buildOutlookComposeMany(
          allEmails,
          `[น้องใส่ใจ] แจ้งประเด็น CONCERN (หลายทีม)`,
          `สวัสดีครับ/ค่ะ\n\n` +
            `ขอแจ้งประเด็น CONCERN เพื่อให้ช่วยตรวจสอบและติดตาม (เกี่ยวข้องหลายทีม)\n\n` +
            `ทีมที่เกี่ยวข้อง:\n- ${targets
              .map((t) => t.team_label || t.team_code)
              .filter(Boolean)
              .join("\n- ")}\n\n` +
            `รายละเอียด/บริบทเพิ่มเติม:\n(กรอกเพิ่มได้ที่นี่)\n\n` +
            `ขอบคุณครับ/ค่ะ\n`,
        )
      : null;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 12 }}>
        {items}
      </div>

      {allHref ? (
        <a
          href={allHref}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            width: "fit-content",
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148, 163, 184, 0.22)",
            background: "rgba(2, 49, 176, 0.06)",
            color: "var(--text)",
            fontWeight: 950,
            textDecoration: "none",
          }}
          title="ส่งอีเมลรวมถึงทุกทีมที่เกี่ยวข้อง"
        >
          ส่งอีเมลรวมถึงทุกทีม ({allEmails.length})
        </a>
      ) : null}
    </div>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(148, 163, 184, 0.22)",
        background: "rgba(2, 49, 176, 0.04)",
        color: "var(--text)",
        fontWeight: 900,
        fontSize: 12,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}

export function ConcernNonRiskCard({
  effectiveStatus,
  hasOverride,
  overrideNotes,
  overriddenAt,
}: Props) {
  // แสดงเฉพาะ override จริง เพื่อไม่ให้สับสนกับ AI output
  if (!hasOverride) return null;

  const status = effectiveStatus ?? "";
  if (status !== "CONCERN" && status !== "NON_RISK") return null;

  const notes = safeJson<any>(overrideNotes);

  const cardStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 18,
    background: "var(--card)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    padding: 14,
  };

  const sectionLine: React.CSSProperties = {
    height: 1,
    background: "rgba(148, 163, 184, 0.16)",
    margin: "14px 0",
  };

  // Header content
  const headerTitle =
    status === "CONCERN" ? "Concern Notes" : "Informational – No Risk";
  const badgeLabel =
    status === "CONCERN" ? "CONCERN" : "Informational – No Risk";

  // Fallback ถ้าไม่มี notes
  if (!notes) {
    return (
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{ fontSize: 16, fontWeight: 950, color: "var(--text)" }}
            >
              {headerTitle}
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                color: "var(--muted)",
                fontWeight: 900,
              }}
            >
              Updated:{" "}
              <span style={{ fontWeight: 950, color: "var(--text)" }}>
                {fmtDT(overriddenAt)}
              </span>
            </div>
          </div>

          <div style={{ marginLeft: "auto" }}>
            <Badge variant="secondary" style={pillTone(status)}>
              {badgeLabel}
            </Badge>
          </div>
        </div>

        <div
          style={{
            fontSize: 13,
            color: "var(--muted)",
            fontWeight: 850,
            lineHeight: 1.6,
          }}
        >
          ไม่มีรายละเอียดที่บันทึกไว้ใน override_notes
        </div>
      </div>
    );
  }

  // --- Render: CONCERN ---
  if (status === "CONCERN") {
    const target = formatConcernTarget(notes);
    const primary = notes?.primary_category ?? null;
    const detail = notes?.detail ?? "-";
    const recommendation = notes?.recommendation ?? null;

    return (
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div
              style={{ fontSize: 16, fontWeight: 950, color: "var(--text)" }}
            >
              Concern Notes
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                color: "var(--muted)",
                fontWeight: 900,
              }}
            ></div>
          </div>

          <div style={{ marginLeft: "auto" }}>
            <Badge variant="secondary" style={pillTone("CONCERN")}>
              CONCERN
            </Badge>
          </div>
        </div>

        {/* Meta pills (single row) */}
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}
        >
          <MetaPill>
            <span style={{ color: "var(--muted)", fontWeight: 950 }}>
              Target
            </span>
            {target}
          </MetaPill>

          {primary ? (
            <MetaPill>
              <span style={{ color: "var(--muted)", fontWeight: 950 }}>
                Category
              </span>
              <span>{primary}</span>
            </MetaPill>
          ) : null}

          <MetaPill>
            <span style={{ color: "var(--muted)", fontWeight: 950 }}>
              Updated
            </span>
            <span>{fmtDT(overriddenAt)}</span>
          </MetaPill>
        </div>

        <div style={sectionLine} />

        {/* Content */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <InfoField label="Detail" value={detail} />
          <InfoField label="Recommendation" value={recommendation ?? "—"} />
        </div>
      </div>
    );
  }

  // --- Render: NON_RISK ---
  const primary = notes?.primary_category ?? null;
  const justification = notes?.justification ?? "-";
  const assumptions = notes?.assumptions ?? null;

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 950, color: "var(--text)" }}>
            Informational – No Risk
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: "var(--muted)",
              fontWeight: 900,
            }}
          >
          </div>
        </div>

        <div style={{ marginLeft: "auto" }}>
          <Badge variant="secondary" style={pillTone("NON_RISK")}>
            Informational – No Risk
          </Badge>
        </div>
      </div>

      {/* Meta pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {primary ? (
          <MetaPill>
            <span style={{ color: "var(--muted)", fontWeight: 950 }}>
              Category
            </span>
            <span>{primary}</span>
          </MetaPill>
        ) : null}

        <MetaPill>
          <span style={{ color: "var(--muted)", fontWeight: 950 }}>
            Updated
          </span>
          <span>{fmtDT(overriddenAt)}</span>
        </MetaPill>
      </div>

      <div style={sectionLine} />

      {/* Content */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <InfoField label="Assessment Summary" value={justification} />
        <InfoField
          label="Re-evaluation Triggers"
          value={assumptions ?? "—"}
        />
      </div>
    </div>
  );
}
