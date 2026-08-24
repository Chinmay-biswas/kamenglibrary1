import { NextResponse } from "next/server";
import { getStats } from "@/lib/seat-service";
import { requireAdmin } from "@/lib/route-auth";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  return NextResponse.json({ admin: true, stats: await getStats() });
}
