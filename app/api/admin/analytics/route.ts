import { NextResponse } from "next/server";
import { getOccupancySummary } from "@/lib/occupancy-service";
import { requireAdmin } from "@/lib/route-auth";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  return NextResponse.json({ analytics: await getOccupancySummary() });
}
