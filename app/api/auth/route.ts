// app/api/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const ADMIN_RULES = new Set(["admin", "admin-it", "admin_it", "risk_team"]);
const OWNER_EMAIL = "pakapop.khi@mfec.co.th";

function normalizeEmail(v: any) {
  const s = typeof v === "string" ? v : "";
  const e = s.trim().toLowerCase();
  return e && e.includes("@") ? e : null;
}

function emailLocalPart(email: string) {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

function cookieShouldBeSecure(req: NextRequest) {
  const xfProto = (req.headers.get("x-forwarded-proto") || "").toLowerCase();
  const proto = xfProto || req.nextUrl.protocol.replace(":", "").toLowerCase();

  const host = (req.headers.get("host") || "").toLowerCase();
  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("0.0.0.0");

  return proto === "https" && !isLocal;
}

function readSession(req: NextRequest) {
  const raw = req.cookies.get("nsj_session")?.value || "";
  if (!raw) return null;
  try {
    const s = Buffer.from(raw, "base64url").toString("utf8");
    const j = JSON.parse(s);
    return j && typeof j === "object" ? j : null;
  } catch {
    return null;
  }
}

async function getEmailFromToken(token: string) {
  const apiKey = process.env.HADB_API_KEY;
  if (!apiKey) throw new Error("missing_HADB_API_KEY");

  const uRes = await fetch("https://hadbapi.mfec.co.th/auth/v1/user", {
    method: "GET",
    headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!uRes.ok) return null;

  const user = await uRes.json().catch(() => null);

  const email =
    normalizeEmail(user?.email) ||
    normalizeEmail(user?.user_metadata?.email) ||
    normalizeEmail(user?.user?.email) ||
    normalizeEmail(user?.user?.user_metadata?.email);

  return email;
}

async function isAdminByPemRules(email: string) {
  const { rows } = await pool.query(
    `
    select 1
    from public.pem_emp_rules
    where lower(email) = $1
      and rule_name is not null
      and lower(rule_name) = any($2::text[])
    limit 1
    `,
    [email.toLowerCase(), Array.from(ADMIN_RULES)]
  );
  return rows?.length > 0;
}

function setCookies(res: NextResponse, req: NextRequest, payload: any) {
  const session = Buffer.from(JSON.stringify(payload)).toString("base64url");

  res.cookies.set("nsj_session", session, {
    httpOnly: true,
    secure: true,        // ✅ HTTPS เท่านั้น
    sameSite: "none",    // ✅ iframe cross-origin
    path: "/",
    maxAge: 60 * 60,
  });

  res.cookies.set("nsj_admin", payload.isAdmin ? "1" : "0", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60,
  });
}


function clearCookies(res: NextResponse, req: NextRequest) {
  const secure = cookieShouldBeSecure(req);
  res.cookies.set("nsj_session", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.cookies.set("nsj_admin", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// GET /api/auth  -> อ่าน session
export async function GET(req: NextRequest) {
  const sess = readSession(req);
  if (!sess?.email) {
    return NextResponse.json({ ok: false, error: "no_session" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    email: String(sess.email).trim().toLowerCase(),
    name: sess.name ?? null,
    isAdmin: Boolean(sess.isAdmin),
  });
}

// POST /api/auth -> รับ token แล้วสร้าง session/cookies
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });
    }

    const email = await getEmailFromToken(token);
    if (!email) {
      return NextResponse.json({ ok: false, error: "invalid_token_or_missing_email" }, { status: 401 });
    }

    const isOwner = email === OWNER_EMAIL;
    const isAdmin = isOwner ? true : await isAdminByPemRules(email);

    const payload = {
      email,
      name: emailLocalPart(email),
      isAdmin,
      iat: Date.now(),
    };

    const res = NextResponse.json({ ok: true, email, isAdmin });
    setCookies(res, req, payload);
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}

// DELETE /api/auth -> logout
export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  clearCookies(res, req);
  return res;
}