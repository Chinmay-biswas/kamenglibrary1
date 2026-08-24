import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { releaseSeat } from "@/lib/seat-service";

export async function POST(req: Request) {
  const { seatId } = await req.json();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const seat = await releaseSeat(seatId, user.id);
    return NextResponse.json({ seat });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
