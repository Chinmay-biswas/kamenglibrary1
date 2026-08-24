import { NextResponse } from "next/server";
import { deleteGeofence, getGeofences, upsertGeofence } from "@/lib/seat-store";
import { logAudit } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  return NextResponse.json({ geofences: await getGeofences() });
}

export async function POST(req: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const geofence = await upsertGeofence({ ...body, id: body.id ?? crypto.randomUUID() });
  await logAudit("GEOFENCE_UPSERTED", { geofenceId: geofence.id }, user?.id);
  return NextResponse.json({ geofence });
}

export async function DELETE(req: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const { id } = await req.json();
  await deleteGeofence(id);
  await logAudit("GEOFENCE_REMOVED", { geofenceId: id }, user?.id);
  return NextResponse.json({ deleted: id });
}
