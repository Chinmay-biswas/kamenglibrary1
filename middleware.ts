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
  const email = typeof token?.email === "string" ? token.email : null;
  const configuredSuperAdmin = Boolean(
    email && (process.env.SUPER_ADMIN_EMAIL ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .includes(email.toLowerCase())
  );
  // JWT roles can be stale after an environment role change. The server-side
  // admin pages and APIs still perform their own authorization checks.
  const hasAdminAccess = configuredSuperAdmin || role === "ADMIN" || role === "SUPER_ADMIN";
  if (!hasAdminAccess) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
  }
  return NextResponse.next();
}
