import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";

export async function POST(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;
  return NextResponse.json({ ok: true, job: "notifications" });
}
