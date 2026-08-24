import { NextResponse } from "next/server";
import { createLayoutElement, createPlacedSeat, listLayoutElements } from "@/lib/layout-service";
import { logAudit } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  return NextResponse.json({ elements: await listLayoutElements() });
}

export async function POST(req: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  try {
    const body = await req.json();
    if (body.type === "SEAT" && !body.seatId) {
      const created = await createPlacedSeat(body);
      await logAudit("LAYOUT_SEAT_ADDED", { seatId: created.seat.id, elementId: created.element.id }, user?.id);
      return NextResponse.json(created, { status: 201 });
    }
    const element = await createLayoutElement(body);
    await logAudit("LAYOUT_ELEMENT_ADDED", { elementId: element.id, type: element.type }, user?.id);
    return NextResponse.json({ element }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
