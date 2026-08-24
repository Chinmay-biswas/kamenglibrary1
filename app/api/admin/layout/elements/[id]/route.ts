import { NextResponse } from "next/server";
import { deleteLayoutElement, updatePlacedSeat } from "@/lib/layout-service";
import { logAudit } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  const element = await updatePlacedSeat(id, await req.json());
  if (!element) return NextResponse.json({ error: "Layout element not found." }, { status: 404 });
  await logAudit("LAYOUT_ELEMENT_UPDATED", { elementId: element.id, type: element.type }, user?.id);
  return NextResponse.json({ element });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  const element = await deleteLayoutElement(id);
  if (!element) return NextResponse.json({ error: "Layout element not found." }, { status: 404 });
  await logAudit("LAYOUT_ELEMENT_DELETED", { elementId: id, type: element.type }, user?.id);
  return NextResponse.json({ deleted: id });
}
