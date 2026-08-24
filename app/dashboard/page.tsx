import { getStats } from "@/lib/seat-service";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { currentSeatForUser, listSeats } from "@/lib/seat-service";
import { listLayoutElements } from "@/lib/layout-service";
import { LibraryMap, MapLegend } from "@/components/layout/library-map";
import { PageIntro, StatCards, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  if (!user.profileComplete) redirect("/profile/setup");
  const [stats, seat, elements, seats] = await Promise.all([getStats(), currentSeatForUser(user.id), listLayoutElements(), listSeats()]);
  return (
    <main className="page-shell">
      <PageIntro eyebrow="Student workspace" title={`Hello, ${user.email.split("@")[0]}.`} action={<Link className="button" href="/scan">Scan a QR</Link>}>
        Your live view of the library, your current seat, and the next action you need to take.
      </PageIntro>
      <StatCards stats={stats} />
      <section className="two-column dashboard-row">
        <article className="panel panel-pad current-seat-card">
          <p className="panel-kicker">Your current seat</p>
          {seat ? <><div className="split-row"><h2 className="panel-title">{seat.code}</h2><StatusBadge status={seat.status} /></div><p>{seat.label}</p><p className="muted">{seat.status === "GRACE" ? `Your two-hour reservation ended. Re-scan the printed Seat QR by ${seat.graceUntil ? new Date(seat.graceUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "the grace deadline"} to keep it.` : `Your session ends at ${seat.occupiedUntil ? new Date(seat.occupiedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "the end of the grace period"}.`}</p><Link className="button button-secondary" href="/my-seat">Manage my seat</Link></> : <><h2 className="panel-title">No seat reserved</h2><p className="muted">Browse the live map, then scan the printed QR on an available seat.</p><div className="inline-actions"><Link className="button" href="/seats">Browse seats</Link><Link className="button button-secondary" href="/scan">Scan Seat QR</Link></div></>}
        </article>
        <article className="panel panel-pad quick-guide"><p className="panel-kicker">Today’s checklist</p><div className="check-line"><b>{seat ? "Done" : "Next"}</b><span>{seat ? "Seat reservation is active." : "Choose an available seat on the live map."}</span></div><div className="check-line"><b>Then</b><span>Use that seat’s own printed QR label. A screenshot alone is not enough.</span></div><div className="check-line"><b>Before leaving</b><span>Release your seat from the app so another reader can use it.</span></div></article>
      </section>
      <section className="panel panel-pad"><div className="split-row"><div><p className="panel-kicker">Floor plan</p><h2 className="panel-title">Choose an available seat.</h2></div><Link className="text-button" href="/seats">Open availability details</Link></div><div className="dashboard-map"><LibraryMap elements={elements} seats={seats} selectedSeatId={seat?.id} /></div><MapLegend /></section>
    </main>
  );
}
