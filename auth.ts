import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Google from "next-auth/providers/google";
import { getAuthUser, upsertAuthUser } from "@/lib/user-service";
import { isSuperAdmin } from "@/lib/permissions";

const providers = [
  ...(process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET && process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ? [MicrosoftEntraID({ clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID, clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET, issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER })] : []),
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })] : [])
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    async signIn({ profile, account }) {
      const email = profile?.email ?? profile?.preferred_username ?? null;
      if (!email) return false;
      if (account?.provider === "microsoft-entra-id" && process.env.ALLOWED_EMAIL_DOMAIN && !email.endsWith(`@${process.env.ALLOWED_EMAIL_DOMAIN}`)) return false;
      await upsertAuthUser({ email, provider: account?.provider === "google" ? "google" : "microsoft-entra-id", providerAccountId: String(profile?.sub ?? profile?.oid ?? email), name: profile?.name });
      return true;
    },
    async jwt({ token, profile }) {
      const email = token.email ?? profile?.email ?? profile?.preferred_username ?? null;
      if (email) {
        const user = await getAuthUser(email);
        // Environment-configured super admins must take priority over a role
        // persisted before the variable was added or changed.
        token.role = isSuperAdmin(email) ? "SUPER_ADMIN" : (user.role ?? "STUDENT");
        token.email = user.email;
        token.sub = user.id;
        token.profileComplete = user.profileComplete;
        token.name = user.name || token.name;
        token.rollNo = user.rollNo;
        token.hostelRoomNo = user.hostelRoomNo;
        token.phoneNumber = user.phoneNumber;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email ?? session.user.email ?? undefined;
        session.user.name = token.name ?? session.user.name;
        session.user.role = (token.role as "STUDENT" | "ADMIN" | "SUPER_ADMIN" | undefined) ?? "STUDENT";
        session.user.id = token.sub ?? session.user.id;
        session.user.profileComplete = Boolean(token.profileComplete);
      }
      return session;
    }
  }
});
