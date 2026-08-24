import { NextResponse } from "next/server";
import { subscribePush } from "@/lib/push-service";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  const body = await req.json();
  const subscription = await subscribePush(user.id, body.endpoint, body.p256dh, body.auth);
  return NextResponse.json({ subscription });
}
