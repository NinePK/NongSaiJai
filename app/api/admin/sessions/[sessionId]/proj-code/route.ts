import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const body = await req.json().catch(() => null);

  // รับ 2 แบบ: { proj_code: "ABC123" } หรือ { proj_code: null }
  if (!body || !("proj_code" in body)) {
    return NextResponse.json({ error: "proj_code is required" }, { status: 400 });
  }

  const proj_code =
    body.proj_code === null
      ? null
      : String(body.proj_code ?? "").trim() || null;

  // update
  const r = await pool.query(
    `
    update public.ai_chat_sessions
    set proj_code = $2
    where id = $1::uuid
    returning id, proj_code
    `,
    [sessionId, proj_code]
  );

  if (r.rowCount === 0) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, session: r.rows[0] });
}
