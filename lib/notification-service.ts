import { randomUUID } from "crypto";
import { isValidObjectId } from "mongoose";
import { NotificationModel } from "@/models/Notification";
import { canUseMongo, connectMongo } from "./mongodb";
import { readLocalStore, updateLocalStore } from "./local-store";

export type NotificationRecord = {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

type NotificationDoc = { _id: unknown; userId: unknown; title: string; body: string; read: boolean; createdAt: unknown };

const memoryNotifications: NotificationRecord[] = [];

async function localAdd(userId: string, title: string, body: string) {
  const note: NotificationRecord = { id: randomUUID(), userId, title, body, read: false, createdAt: new Date().toISOString() };
  memoryNotifications.unshift(note);
  await updateLocalStore((store) => { store.notifications.unshift(note); store.notifications = store.notifications.slice(0, 100); });
  return note;
}

function toRecord(doc: NotificationDoc): NotificationRecord {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    title: doc.title,
    body: doc.body,
    read: doc.read,
    createdAt: new Date(doc.createdAt as Date).toISOString()
  };
}

export async function addNotification(userId: string, title: string, body: string) {
  if (!canUseMongo() || !isValidObjectId(userId)) {
    return localAdd(userId, title, body);
  }
  const connection = await connectMongo();
  if (!connection) {
    return localAdd(userId, title, body);
  }
  const created = await NotificationModel.create({ userId, title, body });
  return toRecord(created as unknown as NotificationDoc);
}

export async function listNotifications(userId: string) {
  if (!canUseMongo() || !isValidObjectId(userId)) {
    return (await readLocalStore()).notifications.filter((item) => item.userId === userId);
  }
  const connection = await connectMongo();
  if (!connection) {
    return (await readLocalStore()).notifications.filter((item) => item.userId === userId);
  }
  const docs = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(50).lean() as unknown as NotificationDoc[];
  return docs.map((doc) => toRecord(doc));
}

async function localRead(id: string, userId?: string) {
  const store = await readLocalStore();
  const note = store.notifications.find((item) => item.id === id);
  if (!note || (userId && note.userId !== userId)) return undefined;
  if (!note.read) {
    await updateLocalStore((s) => {
      const target = s.notifications.find((item) => item.id === id);
      if (target && !target.read) target.read = true;
    });
  }
  return { ...note, read: true };
}

export async function readNotification(id: string, userId?: string) {
  if (!canUseMongo() || (userId && !isValidObjectId(userId))) {
    return localRead(id, userId);
  }
  const connection = await connectMongo();
  if (!connection) {
    return localRead(id, userId);
  }
  const query: Record<string, unknown> = { _id: id };
  if (userId) query.userId = userId;
  const doc = await NotificationModel.findOneAndUpdate(query, { read: true }, { new: true }).lean() as NotificationDoc | null;
  if (!doc) return undefined;
  return toRecord(doc);
}