// app/admin/sessions/page.tsx
import { headers } from "next/headers";
import AdminSessionsClient from "./sessions.client";

type SessionRow = {
  session_id: string;
  proj_code: string | null;

  effective_status: "RISK" | "CONCERN" | "NON_RISK" | null;
  effective_primary_category: string | null;

  ai_status: string | null;
  ai_primary_category: string | null;

  has_override: boolean;
  overridden_at: string | null;

  last_message_at: string | null;
  last_message_snippet: string | null;

  ai_summary: string | null;
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

/**
 * ✅ FIX: headers() เป็น Promise ใน Next รุ่นใหม่ → ต้อง await
 */
async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

async function fetchSessions(baseUrl: string, q: string, status: string) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (status && status !== "ALL") sp.set("status", status);
  sp.set("limit", "50");

  const res = await fetch(`${baseUrl}/api/admin/sessions?${sp.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { items: SessionRow[] };
}

async function fetchSummary(baseUrl: string, q: string, status: string) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (status && status !== "ALL") sp.set("status", status);

  const res = await fetch(
    `${baseUrl}/api/admin/sessions/summary?${sp.toString()}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { ok: boolean; kpi: KPI };
}

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  // ✅ FIX: ต้อง await
  const baseUrl = await getBaseUrl();

  const q = (searchParams.q ?? "").trim();
  const status = (searchParams.status ?? "ALL").trim() || "ALL";

  const [data, summary] = await Promise.all([
    fetchSessions(baseUrl, q, status),
    fetchSummary(baseUrl, q, status),
  ]);

  return (
    <AdminSessionsClient
      initialQuery={q}
      initialStatus={status}
      sessions={data.items}
      kpi={summary?.ok ? summary.kpi : null}
    />
  );
}
