import { NextResponse } from "next/server";
import { listLayoutBlueprints, saveLayoutBlueprint } from "@/lib/layout-service";
import { logAudit } from "@/lib/audit-service";
import { requireAdmin } from "@/lib/route-auth";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  return NextResponse.json({ blueprints: await listLayoutBlueprints() });
}

export async function POST(req: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  try {
    const body = await req.json();
    const blueprint = await saveLayoutBlueprint(String(body.name ?? ""));
    await logAudit("LAYOUT_BLUEPRINT_SAVED", { blueprintId: blueprint.id, name: blueprint.name, elementCount: blueprint.elements.length }, user?.id);
    return NextResponse.json({ blueprint }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
