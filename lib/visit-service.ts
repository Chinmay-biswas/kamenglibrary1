import { randomUUID } from "crypto";
import { isValidObjectId } from "mongoose";
import { LibraryVisitModel } from "@/models/LibraryVisit";
import { canUseMongo, connectMongo } from "./mongodb";
import { readLocalStore, updateLocalStore } from "./local-store";

type VisitRecord = { id: string; userId: string; startedAt: string; expiresAt: string };

const VISIT_DURATION_MS = 8 * 60 * 60 * 1000;

async function localCreateOrRefresh(userId: string, now: Date, expiresAt: Date) {
  return updateLocalStore((store) => {
    const index = store.visits.findIndex((visit) => visit.userId === userId);
    const visit: VisitRecord = { id: index >= 0 ? store.visits[index].id : randomUUID(), userId, startedAt: now.toISOString(), expiresAt: expiresAt.toISOString() };
    if (index >= 0) store.visits[index] = visit;
    else store.visits.push(visit);
    return visit;
  });
}

async function localHasActiveVisit(userId: string) {
  const now = Date.now();
  return (await readLocalStore()).visits.some((visit) => visit.userId === userId && Date.parse(visit.expiresAt) > now);
}

export async function createOrRefreshVisit(userId: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + VISIT_DURATION_MS);
  if (!canUseMongo() || !isValidObjectId(userId)) {
    return localCreateOrRefresh(userId, now, expiresAt);
  }
  const connection = await connectMongo();
  if (!connection) {
    return localCreateOrRefresh(userId, now, expiresAt);
  }
  const doc = await LibraryVisitModel.findOneAndUpdate(
    { userId },
    { userId, startedAt: now, expiresAt },
    { upsert: true, new: true }
  ).lean() as { _id: unknown; userId: unknown; startedAt: Date; expiresAt: Date } | null;
  if (!doc) throw new Error("Visit could not be created.");
  return { id: String(doc._id), userId: String(doc.userId), startedAt: doc.startedAt.toISOString(), expiresAt: doc.expiresAt.toISOString() };
}

export async function hasActiveVisit(userId: string) {
  if (!canUseMongo() || !isValidObjectId(userId)) {
    return localHasActiveVisit(userId);
  }
  const connection = await connectMongo();
  if (!connection) {
    return localHasActiveVisit(userId);
  }
  return Boolean(await LibraryVisitModel.exists({ userId, expiresAt: { $gt: new Date() } }));
}