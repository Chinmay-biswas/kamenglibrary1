import { NextResponse } from "next/server";
import { getStats } from "@/lib/seat-service";
import { requireCronSecret } from "@/lib/cron-auth";

export async function POST(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;
  const stats = await getStats();
  return NextResponse.json({ ok: true, job: "occupancy-snapshot", stats });
}
