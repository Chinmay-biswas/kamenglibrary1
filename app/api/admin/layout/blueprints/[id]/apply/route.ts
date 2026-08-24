import { NextResponse } from "next/server";
import { applyLayoutBlueprint } from "@/lib/layout-service";
import { logAudit } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  try {
    const { id } = await params;
    const applied = await applyLayoutBlueprint(id);
    await logAudit("LAYOUT_BLUEPRINT_APPLIED", { blueprintId: applied.blueprint.id, name: applied.blueprint.name, elementCount: applied.elements.length }, user?.id);
    return NextResponse.json(applied);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
