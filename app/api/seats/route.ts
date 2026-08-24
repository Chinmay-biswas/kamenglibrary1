import { NextResponse } from "next/server";
import { listSeats } from "@/lib/seat-service";

export async function GET() {
  return NextResponse.json({ seats: await listSeats() });
}
