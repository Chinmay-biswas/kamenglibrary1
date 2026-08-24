import { listLayoutBlueprints, listLayoutElements } from "@/lib/layout-service";
import { listSeats } from "@/lib/seat-service";
import { LayoutEditor } from "@/components/admin/layout-editor";
import { AdminNav, PageIntro } from "@/components/ui";
import { requireAdminPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayoutPage() {
  await requireAdminPage("/admin/layout");
  const [elements, seats, blueprints] = await Promise.all([listLayoutElements(), listSeats(), listLayoutBlueprints()]);
  return (
    <main className="page-shell admin-page-shell">
      <AdminNav />
      <PageIntro eyebrow="Layout Studio" title="Draw the library the way it is in real life.">Add rooms, walls, doors, furniture and individual seats. Drag objects to move them and use the inspector for precise dimensions.</PageIntro>
      <LayoutEditor initialElements={elements} initialSeats={seats} initialBlueprints={blueprints} />
    </main>
  );
}
