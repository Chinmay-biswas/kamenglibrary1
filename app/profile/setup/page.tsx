import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfileSetupPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const callback = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/dashboard";
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/profile/setup?callbackUrl=${encodeURIComponent(callback)}`)}`);
  if (user.profileComplete) redirect(callback);
  return <main className="page-shell content-narrow"><div className="profile-intro"><p className="eyebrow">Almost there</p><h1>Complete your library profile.</h1><p>Every new account fills this once before reserving seats.</p></div><ProfileForm email={user.email} initialName={user.name} redirectTo={callback} /></main>;
}
