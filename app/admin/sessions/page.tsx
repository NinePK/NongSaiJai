// app/admin/sessions/page.tsx
import AdminSessionsClient from "./sessions.client";
import { pool } from "@/lib/db";

type SearchParams = {
  q?: string;
  status?: string;
  category?: string;
  mpsent?: string;
  month?: string; // YYYY-MM
};

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // ✅ Next.js App Router: searchParams เป็น Promise
  const {
    q = "",
    status = "ALL",
    category = "ALL",
    mpsent = "ALL",
    month = "",
  } = await searchParams;

  const limit = 50;

  // =========================
  // 1) Load sessions (filtered)
  // =========================
  const { rows: sessions } = await pool.query(
    `
    select
      *
    from
      public.v_ai_session_admin
    where
      (
        $1 = ''
        or proj_code ilike '%' || $1 || '%'
        or ai_summary ilike '%' || $1 || '%'
      )
      and ($2 = 'ALL' or effective_status = $2)
      and ($3 = 'ALL' or effective_primary_category = $3)
      and (
        $4 = 'ALL'
        or ($4 = 'SENT' and is_sent_to_mpsmart = true)
        or ($4 = 'NOT_SENT' and is_sent_to_mpsmart = false)
      )
      and (
        $5 = ''
        or (
          last_message_at is not null
          and date_trunc('month', last_message_at)
              = to_date($5, 'YYYY-MM')
        )
      )
    order by
      last_message_at desc nulls last
    limit $6
    `,
    [q, status, category, mpsent, month, limit]
  );

  // =========================
  // 2) KPI (นับตาม filter ชุดเดียวกัน)
  // =========================
  const { rows: kpiRows } = await pool.query(
    `
    select
      count(*)::int as total,
      count(*) filter (where effective_status = 'ISSUE')::int as issue,
      count(*) filter (where effective_status = 'RISK')::int as risk,
      count(*) filter (where effective_status = 'CONCERN')::int as concern,
      count(*) filter (where effective_status = 'NON_RISK')::int as normal
    from
      public.v_ai_session_admin
    where
      (
        $1 = ''
        or proj_code ilike '%' || $1 || '%'
        or ai_summary ilike '%' || $1 || '%'
      )
      and ($2 = 'ALL' or effective_status = $2)
      and ($3 = 'ALL' or effective_primary_category = $3)
      and (
        $4 = 'ALL'
        or ($4 = 'SENT' and is_sent_to_mpsmart = true)
        or ($4 = 'NOT_SENT' and is_sent_to_mpsmart = false)
      )
      and (
        $5 = ''
        or (
          last_message_at is not null
          and date_trunc('month', last_message_at)
              = to_date($5, 'YYYY-MM')
        )
      )
    `,
    [q, status, category, mpsent, month]
  );

  const kpi = kpiRows?.[0] ?? null;

  return (
    <AdminSessionsClient
      sessions={sessions}
      nextCursor={null}
      kpi={kpi}
      initialQuery={q}
      initialStatus={status}
      initialCategory={category}
      initialMpSent={mpsent}
      initialMonth={month}
    />
  );
}
