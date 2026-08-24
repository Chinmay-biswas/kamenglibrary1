import { NextResponse } from "next/server";
import { findSeat, saveSeat } from "@/lib/seat-store";
import { logAudit } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  const seat = await findSeat(id);
  if (!seat) return NextResponse.json({ error: "Seat not found" }, { status: 404 });
  seat.status = "AVAILABLE";
  const updatedSeat = await saveSeat(seat);
  await logAudit("SEAT_ENABLED", { seatId: updatedSeat.id }, user?.id);
  return NextResponse.json({ seat: updatedSeat });
}
