import { canUseMongo, connectMongo } from "./mongodb";
import { SystemSettingModel } from "@/models/SystemSetting";
import { readLocalStore, updateLocalStore } from "./local-store";

async function localSetting(key: string) {
  const value = (await readLocalStore()).settings[key];
  return value === undefined ? null : { key, value };
}

async function localSettings() {
  return Object.entries((await readLocalStore()).settings).map(([key, value]) => ({ key, value }));
}

export async function getSetting(key: string) {
  if (!canUseMongo()) return localSetting(key);
  const connection = await connectMongo();
  if (!connection) return localSetting(key);
  return SystemSettingModel.findOne({ key }).lean();
}

export async function upsertSetting(key: string, value: unknown) {
  if (!canUseMongo()) return updateLocalStore((store) => { store.settings[key] = value; return { key, value }; });
  const connection = await connectMongo();
  if (!connection) return updateLocalStore((store) => { store.settings[key] = value; return { key, value }; });
  return SystemSettingModel.findOneAndUpdate({ key }, { key, value }, { upsert: true, new: true });
}

export async function listSettings() {
  if (!canUseMongo()) return localSettings();
  const connection = await connectMongo();
  if (!connection) return localSettings();
  return SystemSettingModel.find().sort({ key: 1 }).lean();
}
