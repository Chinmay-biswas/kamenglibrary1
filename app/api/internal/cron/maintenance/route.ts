import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { advanceSeatStates, expireSeatChallenges } from "@/lib/seat-service";

export const dynamic = "force-dynamic";

async function run(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const expiredChallenges = await expireSeatChallenges();
  const seatTransitions = await advanceSeatStates();

  return NextResponse.json({
    ok: true,
    job: "seat-maintenance",
    seatTransitions,
    expiredChallenges: expiredChallenges.length
  }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = run;
export const POST = run;
