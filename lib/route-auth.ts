import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { hasAdminRole } from "./permissions";

export async function requireSignedIn() {
  const user = await getCurrentUser();
  if (user) return { user, response: null };
  return { user: null, response: NextResponse.json({ error: "Sign in is required." }, { status: 401 }) };
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Sign in is required." }, { status: 401 }) };
  if (!hasAdminRole(user.role)) return { user: null, response: NextResponse.json({ error: "Admin access is required." }, { status: 403 }) };
  return { user, response: null };
}
