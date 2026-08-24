import { NextResponse } from "next/server";
import { makeSeatQrPreview } from "@/lib/qr-pdf";
import { findOperationalSeat } from "@/lib/seat-service";
import { requireAdmin } from "@/lib/route-auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  const seat = await findOperationalSeat(id);
  if (!seat) return NextResponse.json({ error: "Seat not found." }, { status: 404 });
  return NextResponse.json({ seat, ...(await makeSeatQrPreview(seat)) });
}
