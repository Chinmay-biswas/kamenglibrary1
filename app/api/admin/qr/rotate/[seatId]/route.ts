import { NextResponse } from "next/server";
import { saveSeat } from "@/lib/seat-store";
import { findOperationalSeat } from "@/lib/seat-service";
import { logAudit } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function POST(_: Request, { params }: { params: Promise<{ seatId: string }> }) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const { seatId } = await params;
  const seat = await findOperationalSeat(seatId);
  if (!seat) return NextResponse.json({ error: "Seat not found" }, { status: 404 });
  seat.qrVersion += 1;
  const updatedSeat = await saveSeat(seat);
  await logAudit("QR_VERSION_ROTATED", { seatId: updatedSeat.id, qrVersion: updatedSeat.qrVersion }, user?.id);
  return NextResponse.json({ seat: updatedSeat });
}
