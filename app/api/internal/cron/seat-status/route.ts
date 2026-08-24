import { NextResponse } from "next/server";
import { advanceSeatStates, expireSeatChallenges, listSeats } from "@/lib/seat-service";
import { requireCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

async function run(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;
  const expiredChallenges = await expireSeatChallenges();
  const transitions = await advanceSeatStates();
  const seats = await listSeats();
  return NextResponse.json({ ok: true, job: "seat-status", refreshed: seats.length, transitions, expiredChallenges: expiredChallenges.length }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = run;
export const POST = run;
