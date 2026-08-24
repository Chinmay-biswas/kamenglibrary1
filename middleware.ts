import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isProtected) return NextResponse.next();

  if (!process.env.AUTH_SECRET) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Authentication is not configured." }, { status: 401 });
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
  }
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const role = token?.role;
  if (!role || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
  }
  return NextResponse.next();
}
