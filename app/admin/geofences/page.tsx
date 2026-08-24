import { getGeofences } from "@/lib/seat-store";
import { GeofenceManager } from "@/components/admin/geofence-manager";
import { AdminNav, PageIntro } from "@/components/ui";
import { requireAdminPage } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminGeofencesPage() {
  await requireAdminPage("/admin/geofences");
  const geofences = await getGeofences();
  return (
    <main className="page-shell">
      <AdminNav />
      <PageIntro eyebrow="Scan boundary" title="Make sure QR scans happen inside the library.">Add one or more building coordinates, then tune their radius after testing with real student phones.</PageIntro>
      <GeofenceManager initialGeofences={geofences} />
    </main>
  );
}
