import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isGoogleConfigured, isMicrosoftConfigured } from "@/lib/auth";
import { signInWithGoogle, signInWithMicrosoft } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const callback = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/dashboard";
  const user = await getCurrentUser();
  if (user) redirect(user.profileComplete ? callback : `/profile/setup?callbackUrl=${encodeURIComponent(callback)}`);
  const googleConfigured = isGoogleConfigured();
  const microsoftConfigured = isMicrosoftConfigured();

  return (
    <main className="login-page">
      <section className="login-panel">
        <p className="eyebrow">Kameng Library</p>
        <h1>Enter the library with your account.</h1>
        <p>Sign in with your institute account to access the library. New accounts complete their library details before using seats.</p>
        {microsoftConfigured && (
          <form action={signInWithMicrosoft}>
            <input type="hidden" name="callbackUrl" value={callback} />
            <button className="button button-microsoft login-button" type="submit">Continue with Microsoft</button>
          </form>
        )}
        {googleConfigured && (
          <>
            {microsoftConfigured && <div className="login-divider">or</div>}
            <form action={signInWithGoogle}>
              <input type="hidden" name="callbackUrl" value={callback} />
              <button className="button button-google login-button" type="submit">Continue with Google</button>
            </form>
          </>
        )}
        {!microsoftConfigured && !googleConfigured && (
          <div className="notice notice-warning">
            Add OAuth values from <code>.env.example</code> to <code>.env.local</code>, then restart the app.
          </div>
        )}
        <p className="login-footnote">New users complete their name, roll number, hostel room, and phone number once after signing in.</p>
        <Link className="text-button" href="/">Return to live availability</Link>
      </section>
      <aside className="login-aside">
        <span className="brand-mark login-mark">K</span>
        <p className="eyebrow">One reliable flow</p>
        <ol>
          <li>Sign in with your institute account.</li>
          <li>Open live availability on your phone.</li>
          <li>Scan the QR printed on the seat you choose.</li>
        </ol>
      </aside>
    </main>
  );
}
