import { NextResponse } from "next/server";
import { unsubscribePush } from "@/lib/push-service";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  const { endpoint } = await req.json();
  await unsubscribePush(endpoint);
  return NextResponse.json({ ok: true });
}
