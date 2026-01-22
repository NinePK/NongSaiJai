// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const isAdmin = req.cookies.get("nsj_admin")?.value === "1";

  if (!isAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/"; // หรือหน้า landing ของคุณ
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
