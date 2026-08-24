import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import type { GeofenceRecord, LayoutBlueprintRecord, LayoutElementRecord, SeatChallengeRecord, SeatRecord } from "./types";

export type LocalUser = {
  id: string;
  email: string;
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  name: string;
  rollNo: string;
  hostelRoomNo: string;
  phoneNumber: string;
  profileComplete: boolean;
};

export type LocalStore = {
  version: 1;
  users: Record<string, LocalUser>;
  seats: SeatRecord[];
  geofences: GeofenceRecord[];
  challenges: SeatChallengeRecord[];
  layout: LayoutElementRecord[];
  blueprints: LayoutBlueprintRecord[];
  settings: Record<string, unknown>;
  audit: Array<{ id: string; action: string; metadata: Record<string, unknown>; actorId?: string; createdAt: string }>;
  notifications: Array<{ id: string; userId: string; title: string; body: string; read: boolean; createdAt: string }>;
  visits: Array<{ id: string; userId: string; startedAt: string; expiresAt: string }>;
  pushSubscriptions: Array<{ userId: string; endpoint: string; p256dh: string; auth: string }>;
  initialized: { seats: boolean; layout: boolean };
};

const storePath = path.join(process.cwd(), "data", "local-store.json");
let cached: LocalStore | null = null;
let writes: Promise<unknown> = Promise.resolve();

function emptyStore(): LocalStore {
  return { version: 1, users: {}, seats: [], geofences: [], challenges: [], layout: [], blueprints: [], settings: {}, audit: [], notifications: [], visits: [], pushSubscriptions: [], initialized: { seats: false, layout: false } };
}

async function loadStore() {
  if (cached) return cached;
  try {
    const parsed = JSON.parse(await readFile(storePath, "utf8")) as Partial<LocalStore>;
    cached = { ...emptyStore(), ...parsed, users: parsed.users ?? {}, seats: parsed.seats ?? [], geofences: parsed.geofences ?? [], challenges: parsed.challenges ?? [], layout: parsed.layout ?? [], blueprints: parsed.blueprints ?? [], settings: parsed.settings ?? {}, audit: parsed.audit ?? [], notifications: parsed.notifications ?? [], visits: parsed.visits ?? [], pushSubscriptions: parsed.pushSubscriptions ?? [], initialized: { ...emptyStore().initialized, ...parsed.initialized } };
  } catch {
    cached = emptyStore();
  }
  return cached;
}

export async function readLocalStore() {
  return structuredClone(await loadStore());
}

export async function updateLocalStore<T>(mutate: (store: LocalStore) => T | Promise<T>) {
  const operation = writes.then(async () => {
    const store = await loadStore();
    const result = await mutate(store);
    await mkdir(path.dirname(storePath), { recursive: true });
    const temporaryPath = `${storePath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(store, null, 2), "utf8");
    await rename(temporaryPath, storePath);
    return result;
  });
  writes = operation.catch(() => undefined);
  return operation;
}
