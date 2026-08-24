import { getChallengesList } from "@/lib/seat-service";
import { listSeats } from "@/lib/seat-service";
import { ChallengeManager } from "@/components/admin/challenge-manager";
import { AdminNav, PageIntro } from "@/components/ui";
import { requireAdminPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminChallengesPage() {
  await requireAdminPage("/admin/challenges");
  const [challenges, seats] = await Promise.all([getChallengesList(), listSeats()]);
  return (
    <main className="page-shell">
      <AdminNav />
      <PageIntro eyebrow="Attendance checks" title="Review empty-seat challenges.">A pending challenge gives the current owner 15 minutes to return and scan the same physical seat label.</PageIntro>
      <ChallengeManager initialChallenges={challenges} seats={seats} />
    </main>
  );
}
