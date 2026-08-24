import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readNotification } from "@/lib/notification-service";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  const { id } = await req.json();
  const notification = await readNotification(id, user.id);
  if (!notification) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  return NextResponse.json({ notification });
}
