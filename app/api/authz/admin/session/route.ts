// app/api/authz/admin/session/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({ token: null }));

  if (!token || typeof token !== "string") {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });
  }

  // call internal authz endpoint
  const checkRes = await fetch(new URL("/api/authz/admin", req.url), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!checkRes.ok) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const data = await checkRes.json();
  if (!data?.allowed) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });

  // HttpOnly cookie used by middleware
  res.cookies.set("nsj_admin", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return res;
}
