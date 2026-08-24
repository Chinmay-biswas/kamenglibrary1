import Link from "next/link";
import { getStats, listSeats } from "@/lib/seat-service";
import { listLayoutElements } from "@/lib/layout-service";
import { LibraryMap, MapLegend } from "@/components/layout/library-map";
import { StatCards } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stats, elements, seats] = await Promise.all([getStats(), listLayoutElements(), listSeats()]);

  return (
    <main className="page-shell home-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Kameng Hostel Library</p>
          <h1>Find a seat. Keep the library fair.</h1>
          <p>Live availability, QR-based attendance, and a floor plan that makes every seat easy to locate.</p>
          <div className="inline-actions">
            <Link className="button" href="/login">Sign in to reserve</Link>
            <Link className="button button-secondary" href="/seats">View live map</Link>
          </div>
        </div>
        <div className="hero-metric" aria-label="Live availability">
          <span>Available right now</span>
          <strong>{stats.free}</strong>
          <small>{stats.total} seats in the current layout</small>
          <div className="hero-meter"><i style={{ width: `${stats.total ? Math.round((stats.free / stats.total) * 100) : 0}%` }} /></div>
        </div>
      </section>
      <StatCards stats={stats} />
      <section className="two-column home-map-row">
        <div className="panel panel-pad">
          <div className="split-row"><div><p className="panel-kicker">Live layout</p><h2 className="panel-title">See the space before you walk in.</h2></div><Link className="text-button" href="/seats">Open full availability</Link></div>
          <div className="home-map"><LibraryMap elements={elements} seats={seats} /></div>
          <MapLegend />
        </div>
        <aside className="how-it-works panel panel-pad">
          <p className="panel-kicker">Simple attendance flow</p>
          <h2 className="panel-title">Printed QR labels, not complicated checkpoints.</h2>
          <ol>
            <li><span>01</span><div><strong>Open live availability</strong><p>Scan the entrance website QR or open this site to view the floor plan on your phone.</p></div></li>
            <li><span>02</span><div><strong>Choose a free seat</strong><p>Read the floor plan, then scan the label printed on that seat.</p></div></li>
            <li><span>03</span><div><strong>Keep it fair</strong><p>Attendance checks give the current holder 15 minutes to return before a seat transfers.</p></div></li>
          </ol>
        </aside>
      </section>
    </main>
  );
}
