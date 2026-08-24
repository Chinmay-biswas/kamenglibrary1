import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { processSeatScan } from "@/lib/scan-service";
import { seatScanSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const body = seatScanSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  try {
    return NextResponse.json(await processSeatScan(user.id, body.data.token, body.data.location));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
