// app/api/mpsmart/lookups/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gname = searchParams.get("gname");

  if (!gname) {
    return NextResponse.json({ error: "gname is required" }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `
      select id, code, value, description
      from public.mpsmart_lookups
      where gname = $1
        and is_active = true
      order by display_order asc
      `,
      [gname]
    );

    return NextResponse.json({ items: rows ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "DB error" },
      { status: 500 }
    );
  }
}
