import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { currentSeatForUser } from "@/lib/seat-service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ seat: await currentSeatForUser(user.id) });
}
