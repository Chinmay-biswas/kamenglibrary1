import { NextResponse } from "next/server";
import { deleteLayoutBlueprint } from "@/lib/layout-service";
import { logAudit } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  const deleted = await deleteLayoutBlueprint(id);
  if (!deleted) return NextResponse.json({ error: "Blueprint not found." }, { status: 404 });
  await logAudit("LAYOUT_BLUEPRINT_DELETED", { blueprintId: id }, user?.id);
  return NextResponse.json({ deleted: id });
}
