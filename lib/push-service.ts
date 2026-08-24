import { isValidObjectId } from "mongoose";
import { PushSubscriptionModel } from "@/models/PushSubscription";
import { canUseMongo, connectMongo } from "./mongodb";
import { updateLocalStore } from "./local-store";

type PushSubscriptionRecord = { userId: string; endpoint: string; p256dh: string; auth: string };

async function localSubscribe(userId: string, endpoint: string, p256dh: string, auth: string) {
  return updateLocalStore((store) => {
    const index = store.pushSubscriptions.findIndex((item) => item.userId === userId && item.endpoint === endpoint);
    const value: PushSubscriptionRecord = { userId, endpoint, p256dh, auth };
    if (index >= 0) store.pushSubscriptions[index] = value;
    else store.pushSubscriptions.push(value);
    return value;
  });
}

async function localUnsubscribe(endpoint: string) {
  await updateLocalStore((store) => {
    store.pushSubscriptions = store.pushSubscriptions.filter((item) => item.endpoint !== endpoint);
  });
}

export async function subscribePush(userId: string, endpoint: string, p256dh: string, auth: string) {
  if (!canUseMongo() || !isValidObjectId(userId)) {
    return localSubscribe(userId, endpoint, p256dh, auth);
  }
  const connection = await connectMongo();
  if (!connection) {
    return localSubscribe(userId, endpoint, p256dh, auth);
  }
  const doc = await PushSubscriptionModel.findOneAndUpdate(
    { userId, endpoint },
    { userId, endpoint, p256dh, auth },
    { upsert: true, new: true }
  ).lean() as { userId: unknown; endpoint: string; p256dh: string; auth: string } | null;
  if (!doc) throw new Error("Push subscription could not be saved.");
  return { userId: String(doc.userId), endpoint: doc.endpoint, p256dh: doc.p256dh, auth: doc.auth };
}

export async function unsubscribePush(endpoint: string) {
  if (!canUseMongo()) {
    return localUnsubscribe(endpoint);
  }
  const connection = await connectMongo();
  if (!connection) {
    return localUnsubscribe(endpoint);
  }
  return PushSubscriptionModel.deleteOne({ endpoint });
}