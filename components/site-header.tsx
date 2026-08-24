import Link from "next/link";
import { signOut } from "@/auth";
import { getCurrentUser } from "@/lib/auth";
import { hasAdminRole } from "@/lib/permissions";
import { MobileNav } from "./mobile-nav";

function UserInitial({ email }: { email: string }) {
  return <span className="user-initial" aria-hidden="true">{email.slice(0, 1).toUpperCase()}</span>;
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  const admin = hasAdminRole(user?.role);

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand" aria-label="Kameng Library home">
          <span className="brand-mark">K</span>
          <span>
            <strong>Kameng Library</strong>
            <small>Seat Operations</small>
          </span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/seats">Availability</Link>
          {user && user.profileComplete && <Link href="/dashboard">My dashboard</Link>}
          {admin && <Link href="/admin">Admin</Link>}
        </nav>
        <MobileNav signedIn={Boolean(user)} profileComplete={Boolean(user?.profileComplete)} admin={admin} />
        <div className="header-account">
          {user ? (
            <>
              <span className="account-label"><UserInitial email={user.email} /> <span>{user.email}</span></span>
              <form action={signOutAction}><button className="button button-quiet" type="submit">Sign out</button></form>
            </>
          ) : (
            <Link className="button button-small" href="/login">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
