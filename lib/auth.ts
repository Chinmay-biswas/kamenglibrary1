import { auth } from "@/auth";
import { getAuthUser } from "./user-service";
import { isSuperAdmin } from "./permissions";

export type CurrentUser = {
  id: string;
  email: string;
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  profileComplete: boolean;
  name?: string;
};

export function isAuthenticationConfigured() {
  return Boolean(
    process.env.AUTH_SECRET && ((process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET && process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER) || (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET))
  );
}

export async function getCurrentUser() {
  if (!process.env.AUTH_SECRET) return null;
  let session;
  try {
    session = await auth();
  } catch {
    return null;
  }
  if (!session?.user?.email) return null;
  // JWT claims are created at sign-in, but profile completion can change during
  // the same session. Read the canonical user record so setup does not loop.
  const storedUser = await getAuthUser(session.user.email);
  return {
    id: storedUser.id ?? session.user.id ?? session.user.email,
    email: storedUser.email,
    role: isSuperAdmin(storedUser.email) ? "SUPER_ADMIN" : (storedUser.role ?? session.user.role ?? "STUDENT"),
    profileComplete: storedUser.profileComplete,
    name: storedUser.name || session.user.name || undefined
  };
}

export function isGoogleConfigured() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

export function isMicrosoftConfigured() {
  return Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET && process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER);
}

export async function getSessionUser() {
  return getCurrentUser();
}
