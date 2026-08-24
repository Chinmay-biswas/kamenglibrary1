import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { currentSeatForUser } from "@/lib/seat-service";
import { PageIntro, StatusBadge } from "@/components/ui";
import { SeatReleaseButton } from "@/components/seats/seat-release-button";

export const dynamic = "force-dynamic";

export default async function MySeatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/my-seat");
  if (!user.profileComplete) redirect("/profile/setup");
  const seat = await currentSeatForUser(user.id);
  const isGracePeriod = seat?.status === "GRACE";
  return (
    <main className="page-shell content-narrow">
      <PageIntro eyebrow="Your reservation" title="My seat" />
      <section className="panel panel-pad my-seat-panel">
        {seat ? <><div className="split-row"><div><p className="panel-kicker">Active reservation</p><h2 className="seat-code-large">{seat.code}</h2><p>{seat.label}</p></div><StatusBadge status={seat.status} /></div><div className="seat-time-grid"><div><span>{isGracePeriod ? "Re-scan by" : "Session ends"}</span><strong>{isGracePeriod && seat.graceUntil ? new Date(seat.graceUntil).toLocaleString() : seat.occupiedUntil ? new Date(seat.occupiedUntil).toLocaleString() : "—"}</strong></div><div><span>QR version</span><strong>v{seat.qrVersion}</strong></div></div><p className="muted">{isGracePeriod ? "Your two-hour reservation ended. Scan this seat's own printed QR before the deadline to renew it for another two hours." : "Leaving early? Release the seat here so it becomes visible to other students straight away."}</p><SeatReleaseButton seatId={seat.id} /></> : <div className="empty-state"><strong>You do not have an active seat.</strong><span>Choose an available seat on the map, then scan its printed QR label.</span><Link className="button" href="/seats">Browse available seats</Link></div>}
      </section>
    </main>
  );
}
