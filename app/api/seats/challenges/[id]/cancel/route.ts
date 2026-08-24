import { NextResponse } from "next/server";
import { resolveChallenge } from "@/lib/seat-service";
import { findChallenge } from "@/lib/seat-store";
import { getCurrentUser } from "@/lib/auth";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  const { id } = await params;
  const challenge = await findChallenge(id);
  if (!challenge || challenge.challengerId !== user.id) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  return NextResponse.json({ challenge: await resolveChallenge(id, "CANCEL") });
}
