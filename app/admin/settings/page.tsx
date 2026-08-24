import { listSettings } from "@/lib/system-setting-service";
import { isAuthenticationConfigured } from "@/lib/auth";
import { canUseMongo } from "@/lib/mongodb";
import { AdminNav, PageIntro } from "@/components/ui";
import { requireAdminPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdminPage("/admin/settings");
  const settings = await listSettings();
  const checks = [
    ["Microsoft sign-in", isAuthenticationConfigured(), "The IITG Microsoft Entra provider is needed for real student access."],
    ["MongoDB storage", canUseMongo(), "When MongoDB is unavailable, the site safely uses local persistent storage."],
    ["QR signing", Boolean(process.env.QR_SIGNING_SECRET), "Set this before printing production QR labels."],
    ["Cron protection", Boolean(process.env.CRON_SECRET), "Use this before exposing scheduled maintenance endpoints."]
  ];
  return (
    <main className="page-shell">
      <AdminNav />
      <PageIntro eyebrow="System readiness" title="Deployment and environment checks.">Sensitive values are never shown here. This page only tells you whether each essential integration is present.</PageIntro>
      <section className="settings-checks">{checks.map(([label, enabled, description]) => <article className="panel panel-pad" key={String(label)}><span className={`check-status ${enabled ? "is-ready" : ""}`}>{enabled ? "Ready" : "Needs setup"}</span><h2 className="panel-title">{label}</h2><p className="muted">{description}</p></article>)}</section>
      <section className="panel panel-pad"><p className="panel-kicker">Stored settings</p><h2 className="panel-title">Application configuration records</h2>{settings.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>{settings.map((setting: any) => <tr key={String(setting._id ?? setting.key)}><td><strong>{setting.key}</strong></td><td><code>{JSON.stringify(setting.value)}</code></td></tr>)}</tbody></table></div> : <div className="empty-state"><strong>No persisted settings yet.</strong><span>Environment checks above are enough for the current release.</span></div>}</section>
    </main>
  );
}
