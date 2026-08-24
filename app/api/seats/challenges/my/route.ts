import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getChallengesList } from "@/lib/seat-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const challenges = await getChallengesList();
  return NextResponse.json({ challenges: challenges.filter((item) => item.challengerId === user.id || item.ownerId === user.id) });
}
