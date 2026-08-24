import { NextResponse } from "next/server";
import { getStats } from "@/lib/seat-service";

export async function GET() {
  return NextResponse.json(await getStats());
}
