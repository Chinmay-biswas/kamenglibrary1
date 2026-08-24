import { NextResponse } from "next/server";
import { listLayoutElements } from "@/lib/layout-service";
import { listSeats } from "@/lib/seat-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const [elements, seats] = await Promise.all([listLayoutElements(), listSeats()]);
  return NextResponse.json({ elements, seats });
}
