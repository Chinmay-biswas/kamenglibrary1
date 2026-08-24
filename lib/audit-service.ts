import { canUseMongo, connectMongo } from "./mongodb";
import { AuditLogModel } from "@/models/AuditLog";
import { isValidObjectId } from "mongoose";
import { readLocalStore, updateLocalStore } from "./local-store";

type AuditRecord = {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  actorId?: string;
  createdAt: string;
};

const memoryAudit: AuditRecord[] = [];

async function localAudit(action: string, metadata: Record<string, unknown>, actorId?: string) {
  const record = { id: crypto.randomUUID(), action, metadata, actorId, createdAt: new Date().toISOString() };
  memoryAudit.unshift(record);
  await updateLocalStore((store) => { store.audit.unshift(record); store.audit = store.audit.slice(0, 200); });
  return record;
}

export async function logAudit(action: string, metadata: Record<string, unknown> = {}, actorId?: string) {
  if (!canUseMongo()) {
    return localAudit(action, metadata, actorId);
  }
  const connection = await connectMongo();
  if (!connection) {
    return localAudit(action, metadata, actorId);
  }
  const safeActorId = actorId && isValidObjectId(actorId) ? actorId : undefined;
  return AuditLogModel.create({ action, metadata, actorId: safeActorId });
}

export async function listAuditLogs() {
  if (!canUseMongo()) return (await readLocalStore()).audit;
  const connection = await connectMongo();
  if (!connection) return (await readLocalStore()).audit;
  return AuditLogModel.find().sort({ createdAt: -1 }).limit(200).lean();
}
