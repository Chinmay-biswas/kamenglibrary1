import { NextResponse } from "next/server";
import { getGeofences, upsertGeofence } from "@/lib/seat-store";
import { logAudit } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  const current = (await getGeofences()).find((item) => item.id === id);
  if (!current) return NextResponse.json({ error: "Geofence not found" }, { status: 404 });
  const geofence = await upsertGeofence({ ...current, ...(await req.json()) });
  await logAudit("GEOFENCE_EDITED", { geofenceId: geofence.id }, user?.id);
  return NextResponse.json({ geofence });
}
