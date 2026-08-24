import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export function requireCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const received = authorization ?? request.headers.get("x-cron-secret");
  if (!expected || !received) return NextResponse.json({ error: "Cron authorization is required." }, { status: 401 });
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return NextResponse.json({ error: "Cron authorization is invalid." }, { status: 401 });
  }
  return null;
}
