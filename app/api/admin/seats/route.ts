import { NextResponse } from "next/server";
import { listSeats } from "@/lib/seat-service";
import { saveSeat } from "@/lib/seat-store";
import { logAudit } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  return NextResponse.json({ seats: await listSeats() });
}

export async function POST(req: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  try {
    const body = await req.json();
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "Seat code is required." }, { status: 400 });
    const seat = await saveSeat({
      code,
      label: String(body.label ?? `Seat ${code}`).trim(),
      zone: body.zone ? String(body.zone).trim() : undefined,
      floor: body.floor ? String(body.floor).trim() : undefined,
      status: "AVAILABLE",
      qrVersion: 1
    });
    await logAudit("SEAT_CREATED", { seatId: seat.id, code: seat.code }, user?.id);
    return NextResponse.json({ seat }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
