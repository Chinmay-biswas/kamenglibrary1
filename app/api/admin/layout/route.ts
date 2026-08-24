import { NextResponse } from "next/server";
import { listLayoutElements } from "@/lib/layout-service";
import { listSeats } from "@/lib/seat-service";
import { requireAdmin } from "@/lib/route-auth";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const [elements, seats] = await Promise.all([listLayoutElements(), listSeats()]);
  return NextResponse.json({ elements, seats });
}
