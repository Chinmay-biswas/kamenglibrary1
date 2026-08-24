import Link from "next/link";
import { getStats } from "@/lib/seat-service";
import { listLayoutElements } from "@/lib/layout-service";
import { AdminNav, PageIntro, StatCards } from "@/components/ui";
import { requireAdminPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireAdminPage("/admin");
  const [stats, layout] = await Promise.all([getStats(), listLayoutElements()]);
  const placedSeatIds = new Set(layout.filter((element) => element.type === "SEAT" && element.seatId).map((element) => element.seatId));
  const placedSeats = placedSeatIds.size;

  return (
    <main className="page-shell">
      <AdminNav />
      <PageIntro eyebrow="Library operations" title="Admin command centre." action={<Link className="button" href="/admin/layout">Edit floor plan</Link>}>Keep the physical library, QR labels, and live occupancy in sync from one place.</PageIntro>
      <StatCards stats={stats} />
      <section className="panel panel-pad admin-layout-sync"><div><p className="panel-kicker">Floor plan data</p><h2 className="panel-title">{placedSeats} active layout seat{placedSeats === 1 ? "" : "s"}</h2><p>Only seats placed in Layout Studio are shown in availability, the seat register, and QR Studio.</p></div><Link className="button button-secondary" href="/admin/layout">Review placements</Link></section>
      <section className="admin-launch-grid"><Link href="/admin/layout"><span>Floor plan</span><strong>Build rooms, walls, and seats exactly as the library is arranged.</strong><i>Open Layout Studio</i></Link><Link href="/admin/qr"><span>Printed QR labels</span><strong>Preview, rotate, and export proper printable seat labels.</strong><i>Open QR Studio</i></Link><Link href="/admin/geofences"><span>Scan boundary</span><strong>Set the real-world area where Gate and Seat scans are allowed.</strong><i>Manage geofences</i></Link><Link href="/admin/projection"><span>Live display</span><strong>Project live availability on a screen inside the library.</strong><i>Open projection</i></Link></section>
    </main>
  );
}
