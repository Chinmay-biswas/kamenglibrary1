import { NextResponse } from "next/server";
import { deleteSeat, findSeat, saveSeat } from "@/lib/seat-store";
import { deleteLayoutElementsForSeat } from "@/lib/layout-service";
import { logAudit } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  return NextResponse.json({ seat: (await findSeat(id)) ?? null });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  const current = await findSeat(id);
  if (!current) return NextResponse.json({ error: "Seat not found." }, { status: 404 });
  const body = await req.json();
  const seat = await saveSeat({
    ...current,
    id: current.id,
    code: body.code ? String(body.code).trim().toUpperCase() : current.code,
    label: body.label ? String(body.label).trim() : current.label,
    zone: body.zone === undefined ? current.zone : String(body.zone).trim(),
    floor: body.floor === undefined ? current.floor : String(body.floor).trim()
  });
  await logAudit("SEAT_UPDATED", { seatId: seat.id }, user?.id);
  return NextResponse.json({ seat });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  const seat = await findSeat(id);
  if (!seat) return NextResponse.json({ error: "Seat not found." }, { status: 404 });
  const deleted = await deleteSeat(seat.id);
  if (!deleted) return NextResponse.json({ error: "Seat could not be deleted." }, { status: 500 });
  const removedElements = await deleteLayoutElementsForSeat(seat.id);
  await logAudit("SEAT_DELETED", { seatId: seat.id, code: seat.code, removedPlacementCount: removedElements.length }, user?.id);
  return NextResponse.json({ deleted: seat.id });
}
