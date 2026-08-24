import { listSeats } from "@/lib/seat-service";
import { SeatManager } from "@/components/admin/seat-manager";
import { AdminNav, PageIntro } from "@/components/ui";
import { requireAdminPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminSeatsPage() {
  await requireAdminPage("/admin/seats");
  const seats = await listSeats();
  return (
    <main className="page-shell">
      <AdminNav />
      <PageIntro eyebrow="Seat register" title="Keep the seat inventory true to the room.">Set a seat to maintenance, disable a removed seat, or open the layout editor to place a new one in the right position.</PageIntro>
      <SeatManager initialSeats={seats} />
    </main>
  );
}
