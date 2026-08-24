import { NextResponse } from "next/server";
import { resolveChallenge } from "@/lib/seat-service";
import { requireAdmin } from "@/lib/route-auth";

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  return NextResponse.json({ challenge: await resolveChallenge(id, "RETURN") });
}
