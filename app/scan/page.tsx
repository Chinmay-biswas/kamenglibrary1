import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ScanPanel } from "@/components/scan/scan-panel";
import { PageIntro } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ token?: string; mode?: string }> }) {
  const { token, mode } = await searchParams;
  // Existing printed Gate labels lead to the same public availability page as the new website QR.
  if (mode === "gate") redirect("/seats");
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/scan");
  if (!user.profileComplete) redirect("/profile/setup");
  return (
    <main className="page-shell content-narrow">
      <PageIntro eyebrow="Seat scanner" title="Reserve or check a library seat.">Scan the printed Seat QR. The app checks the signed label and your current library location.</PageIntro>
      <ScanPanel initialToken={token} />
    </main>
  );
}
