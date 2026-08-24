import { getStats } from "@/lib/seat-service";
import { ProjectionBoard } from "@/components/admin/projection-board";
import { AdminNav, PageIntro } from "@/components/ui";
import { requireAdminPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function ProjectionPage() {
  await requireAdminPage("/admin/projection");
  const stats = await getStats();
  return (
    <main className="page-shell projection-page">
      <AdminNav />
      <PageIntro eyebrow="Large display" title="Live availability projection.">Open this page on the library screen. It refreshes automatically every fifteen seconds.</PageIntro>
      <ProjectionBoard initialStats={stats} />
    </main>
  );
}
