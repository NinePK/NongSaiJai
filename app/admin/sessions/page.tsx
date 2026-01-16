// app/admin/sessions/page.tsx
import { headers } from "next/headers";
import AdminSessionsClient, { type KPI } from "./sessions.client";
import type { SessionRow } from "./SessionsTable";
async function getBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, "");

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

  const raw = (await res.json()) as { items: any[]; nextCursor: string | null };

  // ✅ normalize: กันกรณี API/view ยังไม่ส่ง is_admin_opened มา
  const items: SessionRow[] = (raw.items ?? []).map((r) => ({
    ...r,
    is_admin_opened: Boolean(r.is_admin_opened),
  }));

  return { items, nextCursor: raw.nextCursor };
}

async function fetchSummary(baseUrl: string, q: string, status: string) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (status && status !== "ALL") sp.set("status", status);

  const res = await fetch(`${baseUrl}/api/admin/sessions/summary?${sp.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());

  return (await res.json()) as { ok: boolean; kpi: KPI };
}

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
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
      nextCursor={data.nextCursor}
      kpi={summary?.ok ? summary.kpi : null}
    />
  );
}
