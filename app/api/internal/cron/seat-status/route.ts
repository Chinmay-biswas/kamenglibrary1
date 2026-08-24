import { NextResponse } from "next/server";
import { listSeats } from "@/lib/seat-service";
import { requireCronSecret } from "@/lib/cron-auth";

export async function POST(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;
  const seats = await listSeats();
  return NextResponse.json({ ok: true, job: "seat-status", refreshed: seats.length });
}
