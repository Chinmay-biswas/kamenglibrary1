import { listSeats } from "@/lib/seat-service";
import { SessionManager } from "@/components/admin/session-manager";
import { AdminNav, PageIntro } from "@/components/ui";
import { requireAdminPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  await requireAdminPage("/admin/sessions");
  const seats = await listSeats();
  return (
    <main className="page-shell">
      <AdminNav />
      <PageIntro eyebrow="Live sessions" title="Monitor active reservations.">Use force release only when a seat must be cleared by the library team.</PageIntro>
      <SessionManager initialSeats={seats.filter((seat) => seat.status === "OCCUPIED")} />
    </main>
  );
}
