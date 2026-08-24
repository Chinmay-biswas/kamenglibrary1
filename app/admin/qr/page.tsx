import { listSeats } from "@/lib/seat-service";
import { QrManager } from "@/components/admin/qr-manager";
import { AdminNav, PageIntro } from "@/components/ui";
import { requireAdminPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminQrPage() {
  await requireAdminPage("/admin/qr");
  const seats = await listSeats();
  return (
    <main className="page-shell">
      <AdminNav />
      <PageIntro eyebrow="QR Studio" title="Print labels that work in the real library.">Every generated QR contains a signed, versioned scan link. Rotating a code invalidates old printed copies.</PageIntro>
      <QrManager initialSeats={seats} />
    </main>
  );
}
