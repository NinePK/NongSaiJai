// app/api/authz/admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

function pickBearer(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim();
}

export async function GET(req: NextRequest) {
  const token = pickBearer(req);
  if (!token) {
    return NextResponse.json({ allowed: false, error: "missing_token" }, { status: 401 });
  }

  // 1) get user (email) from hadbapi
  const uRes = await fetch("https://hadbapi.mfec.co.th/auth/v1/user", {
    method: "GET",
    headers: {
      apikey: process.env.HADB_API_KEY!,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!uRes.ok) {
    return NextResponse.json({ allowed: false, error: "invalid_token" }, { status: 401 });
  }

  const user = await uRes.json();
  const email: string | null = user?.email ?? user?.user_metadata?.email ?? null;

  if (!email) {
    return NextResponse.json({ allowed: false, error: "missing_email" }, { status: 403 });
  }

  // 2) authorize by pem_emp_rules OR explicit email allow
  const { rows } = await pool.query(
    `
    select exists (
      select 1
      from public.pem_emp_rules r
      where
        (
          lower(r.email) = lower($1)
          and r.rule_name in ('admin','admin-it','risk_team')
        )
        --or lower($1) = 'pakapop.khi@mfec.co.th'
    ) as allowed
    `,
    [email]
  );

  const allowed = Boolean(rows?.[0]?.allowed);
  return NextResponse.json({ allowed, email }, { status: 200 });
}
