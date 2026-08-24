import { NextResponse } from "next/server";
import { expireSeatChallenges } from "@/lib/seat-service";
import { requireCronSecret } from "@/lib/cron-auth";

export async function POST(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;
  const challenges = await expireSeatChallenges();
  return NextResponse.json({ ok: true, job: "seat-challenges", processed: challenges.length });
}
