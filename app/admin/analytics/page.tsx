import { getStats } from "@/lib/seat-service";
import { AdminNav, PageIntro, StatCards } from "@/components/ui";
import { requireAdminPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireAdminPage("/admin/analytics");
  const stats = await getStats();
  const configured = Math.max(stats.total, 1);
  const rows = [
    ["Available", stats.free, "green"],
    ["Occupied", stats.occupied, "amber"],
    ["Grace period", stats.grace, "blue"],
    ["Maintenance", stats.maintenance, "orange"],
    ["Disabled", stats.disabled, "stone"]
  ];
  return (
    <main className="page-shell">
      <AdminNav />
      <PageIntro eyebrow="Operations analytics" title="A clear read on the library today.">This view updates from the current seat register. Schedule snapshots later if you want long-term trend charts.</PageIntro>
      <StatCards stats={stats} />
      <section className="panel panel-pad analytics-panel"><p className="panel-kicker">Current distribution</p><h2 className="panel-title">Configured seats by state.</h2><div className="analytics-bars">{rows.map(([label, value, tone]) => <div key={String(label)}><span>{label}</span><i><b className={`bar-${tone}`} style={{ width: `${(Number(value) / configured) * 100}%` }} /></i><strong>{value}</strong></div>)}</div></section>
    </main>
  );
}
