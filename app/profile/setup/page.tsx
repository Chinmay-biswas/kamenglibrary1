import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfileSetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/profile/setup");
  if (user.profileComplete) redirect("/dashboard");
  return <main className="page-shell content-narrow"><div className="profile-intro"><p className="eyebrow">Almost there</p><h1>Complete your library profile.</h1><p>Every new account fills this once before reserving seats.</p></div><ProfileForm email={user.email} initialName={user.name} /></main>;
}
