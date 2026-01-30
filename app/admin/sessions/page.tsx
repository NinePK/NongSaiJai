// app/admin/sessions/page.tsx
import AdminSessionsClient from "./sessions.client";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  q?: string;
  status?: string;
  category?: string;
  mpsent?: string;
  month?: string;

  // ✅ multi filters
  concern_scope?: string | string[];
  backoffice_team?: string | string[];
};

function toArr(v: string | string[] | undefined) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const q = sp.q ?? "";
  const status = sp.status ?? "ALL";
  const category = sp.category ?? "ALL";
  const mpsent = sp.mpsent ?? "ALL";
  const month = sp.month ?? "";

  const concernScopes = toArr(sp.concern_scope);
  const backofficeTeams = toArr(sp.backoffice_team);

  const limit = 50;

  // ✅ JSON filter conditions (override_notes)
  // - concernScopes: match any targets[].scope in selected
  // - backofficeTeams: match any targets[] where scope=BACKOFFICE and team_code in selected
  //
  // NOTE: override_notes is TEXT but contains JSON string -> cast ::jsonb
  // Assumption: stored JSON is always valid (ตามตัวอย่างของคุณ)
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
          and date_trunc('month', last_message_at) = to_date($5, 'YYYY-MM')
        )
      )

      -- ✅ concern_scope filter (from override_notes.targets[].scope)
      and (
        cardinality($6::text[]) = 0
        or exists (
          select 1
          from jsonb_array_elements(
            coalesce((override_notes::jsonb)->'targets', '[]'::jsonb)
          ) as t
          where (t->>'scope') = any($6::text[])
        )
      )

      -- ✅ backoffice_team filter (from override_notes.targets[] where scope=BACKOFFICE)
      and (
        cardinality($7::text[]) = 0
        or exists (
          select 1
          from jsonb_array_elements(
            coalesce((override_notes::jsonb)->'targets', '[]'::jsonb)
          ) as t
          where (t->>'scope') = 'BACKOFFICE'
            and (t->>'team_code') = any($7::text[])
        )
      )

    order by
      last_message_at desc nulls last
    limit $8
    `,
    [q, status, category, mpsent, month, concernScopes, backofficeTeams, limit]
  );

  // =========================
  // KPI (นับตาม filter ชุดเดียวกัน)
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
          and date_trunc('month', last_message_at) = to_date($5, 'YYYY-MM')
        )
      )

      and (
        cardinality($6::text[]) = 0
        or exists (
          select 1
          from jsonb_array_elements(
            coalesce((override_notes::jsonb)->'targets', '[]'::jsonb)
          ) as t
          where (t->>'scope') = any($6::text[])
        )
      )

      and (
        cardinality($7::text[]) = 0
        or exists (
          select 1
          from jsonb_array_elements(
            coalesce((override_notes::jsonb)->'targets', '[]'::jsonb)
          ) as t
          where (t->>'scope') = 'BACKOFFICE'
            and (t->>'team_code') = any($7::text[])
        )
      )
    `,
    [q, status, category, mpsent, month, concernScopes, backofficeTeams]
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
      initialConcernScopes={concernScopes}
      initialBackofficeTeams={backofficeTeams}
    />
  );
}
