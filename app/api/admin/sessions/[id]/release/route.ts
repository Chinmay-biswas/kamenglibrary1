import { NextResponse } from "next/server";
import { releaseSeat } from "@/lib/seat-service";
import { logAudit } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  const seat = await releaseSeat(id);
  await logAudit("FORCE_RELEASE", { seatId: seat.id }, user?.id);
  return NextResponse.json({ seat });
}
