import { listAuditLogs } from "@/lib/audit-service";
import { AdminNav, PageIntro } from "@/components/ui";
import { requireAdminPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireAdminPage("/admin/audit");
  const logs = await listAuditLogs();
  return (
    <main className="page-shell">
      <AdminNav />
      <PageIntro eyebrow="Audit trail" title="See the important changes to library operations.">Layout edits, QR rotation, seat status changes, and forced releases are recorded here.</PageIntro>
      <section className="panel panel-pad"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>When</th><th>Action</th><th>Details</th></tr></thead><tbody>{logs.length ? logs.map((log: any) => <tr key={String(log._id ?? log.id)}><td>{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</td><td><strong>{log.action}</strong></td><td><code className="audit-metadata">{JSON.stringify(log.metadata ?? {})}</code></td></tr>) : <tr><td colSpan={3}><div className="empty-state"><strong>No audited actions yet.</strong><span>Changes made through the admin tools will appear here.</span></div></td></tr>}</tbody></table></div></section>
    </main>
  );
}
