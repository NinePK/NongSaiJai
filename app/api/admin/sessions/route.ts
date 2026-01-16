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

  // ✅ NEW
  is_admin_opened: boolean;

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
    const statusRaw = (url.searchParams.get("status") ?? "").trim(); // ISSUE/RISK/CONCERN/NON_RISK/ALL/empty
    const cursorRaw = (url.searchParams.get("cursor") ?? "").trim();

    const limitReq = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const limit = Math.min(Number.isFinite(limitReq) ? limitReq : 50, 200);

    const status = !statusRaw || statusRaw === "ALL" ? "" : statusRaw;

    const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;

    const where: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (q) {
      where.push(`proj_code ILIKE $${i}`);
      params.push(`%${q}%`);
      i++;
    }

    if (status) {
      where.push(`effective_status = $${i}`);
      params.push(status);
      i++;
    }

    // keyset pagination: sort by sort_ts desc nulls last, then session_id desc
    if (cursor) {
      where.push(`
        (
          (
            $${i}::timestamptz IS NOT NULL
            AND sort_ts IS NOT NULL
            AND (
              sort_ts < $${i}::timestamptz
              OR (sort_ts = $${i}::timestamptz AND session_id::text < $${i + 1})
            )
          )
          OR (
            $${i}::timestamptz IS NOT NULL
            AND sort_ts IS NULL
          )
          OR (
            $${i}::timestamptz IS NULL
            AND sort_ts IS NULL
            AND session_id::text < $${i + 1}
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
          session_id,
          proj_code,
          effective_status,
          effective_primary_category,
          ai_status,
          ai_primary_category,
          has_override,
          overridden_at,
          last_message_at,
          last_message_snippet,
          ai_summary,
          is_sent_to_mpsmart,
          mpsmart_sent_at,

          -- ✅ NEW: admin opened (ต้องมีใน view v_ai_session_admin ด้วย)
          is_admin_opened,

          COALESCE(last_message_at, session_created_at) AS sort_ts
        FROM public.v_ai_session_admin
      )
      SELECT
        session_id,
        proj_code,
        effective_status,
        effective_primary_category,
        ai_status,
        ai_primary_category,
        has_override,
        overridden_at,
        last_message_at,
        last_message_snippet,
        ai_summary,
        is_sent_to_mpsmart,
        mpsmart_sent_at,

        -- ✅ NEW
        is_admin_opened,

        sort_ts
      FROM base
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY sort_ts DESC NULLS LAST, session_id::text DESC
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
