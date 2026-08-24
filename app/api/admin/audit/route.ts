import { NextResponse } from "next/server";
import { listAuditLogs } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  return NextResponse.json({ audit: await listAuditLogs() });
}
