import { NextResponse } from "next/server";
import { makeGateQrPreview } from "@/lib/qr-pdf";
import { requireAdmin } from "@/lib/route-auth";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  return NextResponse.json(await makeGateQrPreview());
}
