import { randomUUID } from "crypto";
import { isValidObjectId } from "mongoose";
import { UserModel } from "@/models/User";
import { canUseMongo, connectMongo } from "./mongodb";
import { readLocalStore, updateLocalStore } from "./local-store";
import { isSuperAdmin } from "./permissions";

export type ProfileFields = { name: string; rollNo: string; hostelRoomNo: string; phoneNumber: string };
export type AuthUserRecord = ProfileFields & { id: string; email: string; role: "STUDENT" | "ADMIN" | "SUPER_ADMIN"; profileComplete: boolean };

function toRecord(user: any): AuthUserRecord {
  return {
    id: String(user._id ?? user.id), email: user.email, role: user.role ?? "STUDENT",
    name: user.name ?? "", rollNo: user.rollNo ?? "", hostelRoomNo: user.hostelRoomNo ?? "", phoneNumber: user.phoneNumber ?? "",
    profileComplete: Boolean(user.profileCompleted ?? (user.name && user.rollNo && user.hostelRoomNo && user.phoneNumber))
  };
}

async function localUser(email: string, name = "") {
  const key = email.toLowerCase();
  const store = await readLocalStore();
  const existing = store.users[key];
  if (existing) return existing as AuthUserRecord;
  const created: AuthUserRecord = { id: email || randomUUID(), email, role: isSuperAdmin(email) ? "SUPER_ADMIN" : "STUDENT", name, rollNo: "", hostelRoomNo: "", phoneNumber: "", profileComplete: false };
  await updateLocalStore((next) => { next.users[key] = created; });
  return created;
}

async function findLocalUserById(id: string) {
  const store = await readLocalStore();
  return Object.values(store.users).find((user) => user.id === id || user.email === id) as AuthUserRecord | undefined;
}

export async function upsertAuthUser(input: { email: string; provider: "microsoft-entra-id" | "google"; providerAccountId: string; name?: string | null }) {
  if (!canUseMongo()) return localUser(input.email, input.name ?? "");
  const connection = await connectMongo();
  if (!connection) return localUser(input.email, input.name ?? "");
  const user = await UserModel.findOneAndUpdate(
    { email: input.email },
    { $set: { provider: input.provider, providerAccountId: input.providerAccountId, ...(isSuperAdmin(input.email) ? { role: "SUPER_ADMIN" } : {}) }, $setOnInsert: { email: input.email, microsoftId: input.provider === "microsoft-entra-id" ? input.providerAccountId : undefined, name: input.name ?? "", role: isSuperAdmin(input.email) ? "SUPER_ADMIN" : "STUDENT", profileCompleted: false } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return toRecord(user);
}

export async function getAuthUser(email: string) {
  if (!canUseMongo()) return localUser(email);
  const connection = await connectMongo();
  if (!connection) return localUser(email);
  const user = await UserModel.findOne({ email }).lean();
  return user ? toRecord(user) : localUser(email);
}

// Challenge results use a minimal owner summary, so this lookup must never create a new user.
export async function findAuthUserById(id: string) {
  const localUser = await findLocalUserById(id);
  if (!canUseMongo() || !isValidObjectId(id)) return localUser;
  const connection = await connectMongo();
  if (!connection) return localUser;
  const user = await UserModel.findById(id).lean();
  return user ? toRecord(user) : localUser;
}

export async function updateProfile(email: string, fields: ProfileFields) {
  const cleaned = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()])) as ProfileFields;
  if (!canUseMongo()) {
    const user = await localUser(email); Object.assign(user, cleaned, { profileComplete: true });
    await updateLocalStore((next) => { next.users[email.toLowerCase()] = user; });
    return user;
  }
  const connection = await connectMongo();
  if (!connection) {
    const user = await localUser(email); Object.assign(user, cleaned, { profileComplete: true });
    await updateLocalStore((next) => { next.users[email.toLowerCase()] = user; });
    return user;
  }
  const user = await UserModel.findOneAndUpdate({ email }, { $set: { ...cleaned, profileCompleted: true } }, { new: true }).lean();
  return user ? toRecord(user) : undefined;
}
