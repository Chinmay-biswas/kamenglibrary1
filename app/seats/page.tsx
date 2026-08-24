import { listSeats } from "@/lib/seat-service";
import { listLayoutElements } from "@/lib/layout-service";
import { LibraryMap, MapLegend } from "@/components/layout/library-map";
import { PageIntro, StatusBadge } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SeatsPage() {
  const [seats, elements] = await Promise.all([listSeats(), listLayoutElements()]);
  return (
    <main className="page-shell">
      <PageIntro eyebrow="Live availability" title="Choose the right corner of the library." action={<Link className="button" href="/scan">Scan a QR</Link>}>
        The map refreshes when the page is opened. Scan the printed QR on an available seat to reserve it.
      </PageIntro>
      <section className="two-column availability-layout">
        <div className="panel panel-pad"><LibraryMap elements={elements} seats={seats} /><MapLegend /></div>
        <aside className="panel panel-pad availability-summary"><p className="panel-kicker">Seat register</p><h2 className="panel-title">{seats.filter((seat) => seat.status === "AVAILABLE").length} seats open</h2><div className="seat-mini-list">{seats.map((seat) => <div key={seat.id}><div><strong>{seat.code}</strong><span>{seat.label}</span></div><StatusBadge status={seat.status} /></div>)}</div></aside>
      </section>
    </main>
  );
}
