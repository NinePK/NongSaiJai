// app/api/admin/sessions/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type Row = {
  session_id: string;
  proj_code: string | null;

  effective_status: "ISSUE" | "RISK" | "CONCERN" | "NON_RISK" | null;
  effective_primary_category: string | null;

  ai_status: string | null;
  ai_primary_category: string | null;

  has_override: boolean;
  overridden_at: string | null;

  last_message_at: string | null;
  last_message_snippet: string | null;

  ai_summary: string | null;

  is_sent_to_mpsmart: boolean;
  mpsmart_sent_at: string | null;

  is_admin_opened: boolean;

  // ✅ ส่งออกไปให้ฝั่ง UI เอาไปโชว์ scope/team ที่ Status ได้
  override_notes: string | null;

  sort_ts: string | null;
};

function encodeCursor(v: { ts: string | null; id: string }) {
  return Buffer.from(JSON.stringify(v)).toString("base64url");
}

function decodeCursor(cursor: string): { ts: string | null; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object") return null;
    if (!("id" in j)) return null;
    return { ts: j.ts ?? null, id: String((j as any).id) };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const q = (url.searchParams.get("q") ?? "").trim();
    const statusRaw = (url.searchParams.get("status") ?? "").trim(); // ISSUE/RISK/CONCERN/NON_RISK/ALL
    const categoryRaw = (url.searchParams.get("category") ?? "").trim(); // People/Process/...
    const mpsentRaw = (url.searchParams.get("mpsent") ?? "").trim(); // SENT/NOT_SENT/ALL
    const month = (url.searchParams.get("month") ?? "").trim(); // YYYY-MM
    const cursorRaw = (url.searchParams.get("cursor") ?? "").trim();

    // ✅ MULTI: allow repeated query keys
    const concernScopes = url.searchParams
      .getAll("concern_scope")
      .map((s) => s.trim())
      .filter((s) => s && s !== "ALL");

    const backofficeTeams = url.searchParams
      .getAll("backoffice_team")
      .map((s) => s.trim())
      .filter((s) => s && s !== "ALL");

    const limitReq = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const limit = Math.min(Number.isFinite(limitReq) ? limitReq : 50, 200);

    const status = !statusRaw || statusRaw === "ALL" ? "" : statusRaw;
    const category = !categoryRaw || categoryRaw === "ALL" ? "" : categoryRaw;
    const mpsent = !mpsentRaw || mpsentRaw === "ALL" ? "" : mpsentRaw;

    const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;

    const where: string[] = [];
    const params: any[] = [];
    let i = 1;

    // ✅ search
    if (q) {
      where.push(`(b.proj_code ILIKE $${i} OR b.ai_summary ILIKE $${i})`);
      params.push(`%${q}%`);
      i++;
    }

    // ✅ status
    if (status) {
      where.push(`b.effective_status = $${i}`);
      params.push(status);
      i++;
    }

    // ✅ category
    if (category) {
      where.push(`b.effective_primary_category = $${i}`);
      params.push(category);
      i++;
    }

    // ✅ mpsent
    if (mpsent === "SENT") {
      where.push(`b.is_sent_to_mpsmart = true`);
    } else if (mpsent === "NOT_SENT") {
      where.push(`b.is_sent_to_mpsmart = false`);
    }

    // ✅ month (YYYY-MM) -> match last_message_at month
    if (month) {
      where.push(`
        (
          b.last_message_at IS NOT NULL
          AND date_trunc('month', b.last_message_at)
              = date_trunc('month', (($${i}::text || '-01')::date))
        )
      `);
      params.push(month);
      i++;
    }

    // ✅ MULTI filter: Concern scope(s)
    // ใช้จาก override_notes (เฉพาะ override_status=CONCERN และ is_active=true เท่านั้น)
    if (concernScopes.length > 0) {
      where.push(`
        (
          b.override_status = 'CONCERN'
          AND b.override_notes IS NOT NULL
          AND (b.override_notes::jsonb -> 'target' ->> 'scope') = ANY($${i}::text[])
        )
      `);
      params.push(concernScopes);
      i++;
    }

    // ✅ MULTI filter: Backoffice team(s)
    // ทำงานเมื่อ target.scope = BACKOFFICE และ team_code อยู่ใน targets[]
    if (backofficeTeams.length > 0) {
      where.push(`
        (
          b.override_status = 'CONCERN'
          AND b.override_notes IS NOT NULL
          AND (b.override_notes::jsonb -> 'target' ->> 'scope') = 'BACKOFFICE'
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(b.override_notes::jsonb -> 'targets') AS t
            WHERE (t ->> 'team_code') = ANY($${i}::text[])
          )
        )
      `);
      params.push(backofficeTeams);
      i++;
    }

    // ✅ keyset pagination
    if (cursor) {
      where.push(`
        (
          (
            $${i}::timestamptz IS NOT NULL
            AND b.sort_ts IS NOT NULL
            AND (
              b.sort_ts < $${i}::timestamptz
              OR (b.sort_ts = $${i}::timestamptz AND b.session_id::text < $${i + 1})
            )
          )
          OR (
            $${i}::timestamptz IS NOT NULL
            AND b.sort_ts IS NULL
          )
          OR (
            $${i}::timestamptz IS NULL
            AND b.sort_ts IS NULL
            AND b.session_id::text < $${i + 1}
          )
        )
      `);
      params.push(cursor.ts);
      params.push(cursor.id);
      i += 2;
    }

    params.push(limit + 1);
    const limitParam = `$${i}`;

    const sql = `
      WITH base AS (
        SELECT
          v.session_id,
          v.proj_code,
          v.effective_status,
          v.effective_primary_category,
          v.ai_status,
          v.ai_primary_category,
          v.has_override,
          v.overridden_at,
          v.last_message_at,
          v.last_message_snippet,
          v.ai_summary,
          v.is_sent_to_mpsmart,
          v.mpsmart_sent_at,
          v.is_admin_opened,
          COALESCE(v.last_message_at, v.session_created_at) AS sort_ts,

          -- ✅ override payload (เฉพาะ active)
          o.override_status,
          o.override_notes

        FROM public.v_ai_session_admin v
        LEFT JOIN public.ai_admin_overrides o
          ON o.session_id = v.session_id
         AND o.is_active = true
      )
      SELECT
        b.session_id,
        b.proj_code,
        b.effective_status,
        b.effective_primary_category,
        b.ai_status,
        b.ai_primary_category,
        b.has_override,
        b.overridden_at,
        b.last_message_at,
        b.last_message_snippet,
        b.ai_summary,
        b.is_sent_to_mpsmart,
        b.mpsmart_sent_at,
        b.is_admin_opened,
        b.override_notes,
        b.sort_ts
      FROM base b
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY b.sort_ts DESC NULLS LAST, b.session_id::text DESC
      LIMIT ${limitParam}
    `;

    const { rows } = await pool.query<Row>(sql, params);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ ts: last.sort_ts ?? null, id: String(last.session_id) })
        : null;

    const cleaned = items.map(({ sort_ts, ...rest }) => rest);

    return NextResponse.json({ items: cleaned, nextCursor });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
  }
}
