import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findChallenge } from "@/lib/seat-store";
import { currentSeatForUser, expireSeatChallenges } from "@/lib/seat-service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  const { id } = await params;
  const existing = await findChallenge(id);
  if (!existing || (existing.challengerId !== user.id && existing.ownerId !== user.id)) {
    return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  }

  await expireSeatChallenges();
  return NextResponse.json({ challenge: await findChallenge(id), currentSeat: await currentSeatForUser(user.id) });
}
