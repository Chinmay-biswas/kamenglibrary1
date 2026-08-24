import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateProfile } from "@/lib/user-service";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  const body = await request.json();
  const fields = {
    name: String(body.name ?? "").trim(),
    rollNo: String(body.rollNo ?? "").trim(),
    hostelRoomNo: String(body.hostelRoomNo ?? "").trim(),
    phoneNumber: String(body.phoneNumber ?? "").trim()
  };
  if (Object.values(fields).some((value) => !value)) return NextResponse.json({ error: "All profile fields are required." }, { status: 400 });
  if (!/^[0-9+()\-\s]{8,20}$/.test(fields.phoneNumber)) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  const profile = await updateProfile(user.email, fields);
  return NextResponse.json({ profile });
}
