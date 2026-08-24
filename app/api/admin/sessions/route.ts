import { NextResponse } from "next/server";
import { listSeats } from "@/lib/seat-service";
import { requireAdmin } from "@/lib/route-auth";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const seats = await listSeats();
  return NextResponse.json({ activeSessions: seats.filter((seat) => seat.status === "OCCUPIED") });
}
