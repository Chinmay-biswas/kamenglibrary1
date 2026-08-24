import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { LayoutElementModel } from "@/models/LayoutElement";
import { LayoutBlueprintModel } from "@/models/LayoutBlueprint";
import { LayoutBlueprintRecord, LayoutElementRecord, LayoutElementType, SeatRecord } from "./types";
import { canUseMongo, connectMongo } from "./mongodb";
import { getSeatStore, saveSeat } from "./seat-store";
import { SystemSettingModel } from "@/models/SystemSetting";
import { readLocalStore, updateLocalStore } from "./local-store";

const memoryLayout: LayoutElementRecord[] = [];

async function ensureLocalLayout(seats: SeatRecord[]) {
  const store = await readLocalStore();
  if (store.initialized.layout) {
    memoryLayout.splice(0, memoryLayout.length, ...store.layout);
    return;
  }
  memoryLayout.splice(0, memoryLayout.length, ...defaultLayout(seats));
  await updateLocalStore((next) => { next.layout = [...memoryLayout]; next.initialized.layout = true; });
}

async function persistLocalLayout() {
  await updateLocalStore((next) => { next.layout = [...memoryLayout]; next.initialized.layout = true; });
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalise(element: Partial<LayoutElementRecord> & { type: LayoutElementType }): Omit<LayoutElementRecord, "id"> {
  const width = clamp(Number(element.width ?? (element.type === "WALL" ? 2 : 10)), 1, 1000);
  const height = clamp(Number(element.height ?? (element.type === "WALL" ? 18 : 8)), 1, 1000);
  return {
    type: element.type,
    x: clamp(Number(element.x ?? 10), -10000, 10000),
    y: clamp(Number(element.y ?? 10), -10000, 10000),
    width,
    height,
    rotation: Number(element.rotation ?? 0),
    label: element.label?.trim() || undefined,
    seatId: element.seatId,
    floor: element.floor?.trim() || undefined,
    zone: element.zone?.trim() || undefined,
    color: element.color
  };
}

function fromDoc(doc: any): LayoutElementRecord {
  return {
    id: String(doc._id ?? doc.id),
    type: doc.type,
    x: doc.x,
    y: doc.y,
    width: doc.width,
    height: doc.height,
    rotation: doc.rotation ?? 0,
    label: doc.label,
    seatId: doc.seatId ? String(doc.seatId) : undefined,
    floor: doc.floor,
    zone: doc.zone,
    color: doc.color
  };
}

function fromBlueprintDoc(doc: any): LayoutBlueprintRecord {
  return {
    id: String(doc._id ?? doc.id),
    name: doc.name,
    elements: (doc.elements ?? []).map((element: LayoutElementRecord) => ({ ...element })),
    seats: (doc.seats ?? []).map((seat: SeatRecord) => ({ ...seat })),
    createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt ?? new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt ?? new Date().toISOString()
  };
}

function defaultLayout(seats: SeatRecord[]): LayoutElementRecord[] {
  const elements: LayoutElementRecord[] = [
    { id: "room-main", type: "ROOM", x: 3, y: 6, width: 94, height: 86, label: "Main Reading Hall", color: "#d9e8dc" },
    { id: "room-quiet", type: "ROOM", x: 58, y: 12, width: 33, height: 55, label: "Quiet Study", color: "#e7e2cf" },
    { id: "wall-quiet", type: "WALL", x: 56, y: 8, width: 1.5, height: 66, label: "Partition" },
    { id: "door-main", type: "DOOR", x: 42, y: 91, width: 15, height: 2, label: "Entrance" },
    { id: "label-main", type: "LABEL", x: 7, y: 10, width: 28, height: 4, label: "KAMENG LIBRARY" },
    { id: "table-01", type: "TABLE", x: 10, y: 24, width: 26, height: 14, label: "Study table" },
    { id: "table-02", type: "TABLE", x: 10, y: 51, width: 26, height: 14, label: "Study table" }
  ];
  const positions = [[13, 27], [21, 27], [29, 27], [13, 54], [21, 54], [29, 54], [63, 25], [73, 25], [63, 46], [73, 46]];
  seats.forEach((seat, index) => {
    const [x, y] = positions[index] ?? [10 + (index % 8) * 10, 75 + Math.floor(index / 8) * 10];
    elements.push({ id: `seat-${seat.id}`, type: "SEAT", x, y, width: 6, height: 8, label: seat.code, seatId: seat.id, zone: seat.zone ?? "A" });
  });
  return elements;
}

async function ensureLayout() {
  const seats = await getSeatStore();
  if (!canUseMongo()) {
    await ensureLocalLayout(seats);
    return;
  }
  const connection = await connectMongo();
  if (!connection) {
    await ensureLocalLayout(seats);
    return;
  }
  const layoutSeedMarker = await SystemSettingModel.findOne({ key: "layout_seeded" }).lean();
  if (!layoutSeedMarker) {
    if ((await LayoutElementModel.countDocuments()) === 0) {
      await LayoutElementModel.insertMany(defaultLayout(seats).map(({ id: _id, ...element }) => element));
    }
    await SystemSettingModel.create({ key: "layout_seeded", value: true });
  }
}

export async function listLayoutElements() {
  await ensureLayout();
  if (!canUseMongo()) return [...memoryLayout];
  const elements = await LayoutElementModel.find().sort({ createdAt: 1 }).lean();
  return elements.map(fromDoc);
}

export async function createLayoutElement(input: Partial<LayoutElementRecord> & { type: LayoutElementType }) {
  const element = normalise(input);
  await ensureLayout();
  if (!canUseMongo()) {
    const created = { ...element, id: randomUUID() };
    memoryLayout.push(created);
    await persistLocalLayout();
    return created;
  }
  const connection = await connectMongo();
  if (!connection) {
    const created = { ...element, id: randomUUID() };
    memoryLayout.push(created);
    await persistLocalLayout();
    return created;
  }
  return fromDoc(await LayoutElementModel.create(element));
}

export async function updateLayoutElement(id: string, input: Partial<LayoutElementRecord>) {
  await ensureLayout();
  if (!canUseMongo()) {
    const index = memoryLayout.findIndex((element) => element.id === id);
    if (index < 0) return undefined;
    const updated = { ...memoryLayout[index], ...normalise({ ...memoryLayout[index], ...input }) };
    memoryLayout[index] = updated;
    await persistLocalLayout();
    return updated;
  }
  if (!mongoose.isValidObjectId(id)) return undefined;
  const current = await LayoutElementModel.findById(id).lean();
  if (!current) return undefined;
  const updated = await LayoutElementModel.findByIdAndUpdate(id, normalise({ ...fromDoc(current), ...input }), { new: true });
  return updated ? fromDoc(updated) : undefined;
}

export async function deleteLayoutElement(id: string) {
  await ensureLayout();
  if (!canUseMongo()) {
    const index = memoryLayout.findIndex((element) => element.id === id);
    if (index < 0) return undefined;
    const deleted = memoryLayout.splice(index, 1)[0];
    await persistLocalLayout();
    return deleted;
  }
  if (!mongoose.isValidObjectId(id)) return undefined;
  const deleted = await LayoutElementModel.findByIdAndDelete(id);
  return deleted ? fromDoc(deleted) : undefined;
}

export async function deleteLayoutElementsForSeat(seatId: string) {
  const elements = (await listLayoutElements()).filter((element) => element.type === "SEAT" && element.seatId === seatId);
  for (const element of elements) await deleteLayoutElement(element.id);
  return elements;
}

export async function createPlacedSeat(input: {
  code?: string;
  label?: string;
  zone?: string;
  floor?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}) {
  const seats = await getSeatStore();
  const prefix = input.zone?.trim().toUpperCase() || "A";
  const matching = seats
    .map((seat) => Number(seat.code.match(new RegExp(`^${prefix}-(\\d+)$`))?.[1] ?? 0))
    .filter(Boolean);
  const nextNumber = Math.max(0, ...matching) + 1;
  const code = input.code?.trim().toUpperCase() || `${prefix}-${String(nextNumber).padStart(3, "0")}`;
  if (seats.some((seat) => seat.code.toUpperCase() === code)) throw new Error(`Seat code ${code} already exists`);
  const seat = await saveSeat({ code, label: input.label?.trim() || `Seat ${code}`, zone: input.zone?.trim(), floor: input.floor?.trim(), status: "AVAILABLE", qrVersion: 1 });
  const element = await createLayoutElement({
    type: "SEAT",
    x: input.x,
    y: input.y,
    width: input.width ?? 6,
    height: input.height ?? 8,
    label: seat.code,
    seatId: seat.id,
    zone: seat.zone,
    floor: seat.floor
  });
  return { seat, element };
}

export async function updatePlacedSeat(elementId: string, values: Partial<LayoutElementRecord> & { seat?: Partial<SeatRecord> }) {
  const element = await updateLayoutElement(elementId, values);
  if (!element) return undefined;
  if (element.seatId && values.seat) {
    const existing = (await getSeatStore()).find((seat) => seat.id === element.seatId);
    if (existing) await saveSeat({ ...existing, ...values.seat, id: existing.id });
  }
  return element;
}

function blueprintName(name: string) {
  const value = name.trim().replace(/\s+/g, " ");
  if (!value) throw new Error("Enter a name for the blueprint.");
  if (value.length > 80) throw new Error("Blueprint names must be 80 characters or fewer.");
  return value;
}

function blueprintSnapshot(elements: LayoutElementRecord[], seats: SeatRecord[]) {
  const seatIds = new Set(elements.filter((element) => element.type === "SEAT" && element.seatId).map((element) => element.seatId));
  return {
    elements: elements.map((element) => ({ ...element })),
    seats: seats.filter((seat) => seatIds.has(seat.id)).map((seat) => ({ ...seat }))
  };
}

export async function listLayoutBlueprints() {
  if (!canUseMongo()) return (await readLocalStore()).blueprints.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const connection = await connectMongo();
  if (!connection) return (await readLocalStore()).blueprints.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (await LayoutBlueprintModel.find().sort({ updatedAt: -1 }).lean()).map(fromBlueprintDoc);
}

export async function saveLayoutBlueprint(name: string) {
  const [elements, seats] = await Promise.all([listLayoutElements(), getSeatStore()]);
  const cleanedName = blueprintName(name);
  const snapshot = blueprintSnapshot(elements, seats);
  const now = new Date().toISOString();

  if (!canUseMongo()) {
    return updateLocalStore((store) => {
      const index = store.blueprints.findIndex((blueprint) => blueprint.name.toLowerCase() === cleanedName.toLowerCase());
      const existing = index >= 0 ? store.blueprints[index] : undefined;
      const blueprint: LayoutBlueprintRecord = {
        id: existing?.id ?? randomUUID(),
        name: cleanedName,
        ...snapshot,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      };
      if (index >= 0) store.blueprints[index] = blueprint;
      else store.blueprints.unshift(blueprint);
      return blueprint;
    });
  }

  const connection = await connectMongo();
  if (!connection) return saveLayoutBlueprintLocal(cleanedName, snapshot, now);
  const blueprint = await LayoutBlueprintModel.findOneAndUpdate(
    { name: cleanedName },
    { $set: { elements: snapshot.elements, seats: snapshot.seats } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return fromBlueprintDoc(blueprint);
}

async function saveLayoutBlueprintLocal(name: string, snapshot: ReturnType<typeof blueprintSnapshot>, now: string) {
  return updateLocalStore((store) => {
    const index = store.blueprints.findIndex((blueprint) => blueprint.name.toLowerCase() === name.toLowerCase());
    const existing = index >= 0 ? store.blueprints[index] : undefined;
    const blueprint: LayoutBlueprintRecord = { id: existing?.id ?? randomUUID(), name, ...snapshot, createdAt: existing?.createdAt ?? now, updatedAt: now };
    if (index >= 0) store.blueprints[index] = blueprint;
    else store.blueprints.unshift(blueprint);
    return blueprint;
  });
}

async function findLayoutBlueprint(id: string) {
  if (!canUseMongo()) return (await readLocalStore()).blueprints.find((blueprint) => blueprint.id === id);
  const connection = await connectMongo();
  if (!connection) return (await readLocalStore()).blueprints.find((blueprint) => blueprint.id === id);
  if (!mongoose.isValidObjectId(id)) return undefined;
  const blueprint = await LayoutBlueprintModel.findById(id).lean();
  return blueprint ? fromBlueprintDoc(blueprint) : undefined;
}

export async function deleteLayoutBlueprint(id: string) {
  if (!canUseMongo()) {
    return updateLocalStore((store) => {
      const index = store.blueprints.findIndex((blueprint) => blueprint.id === id);
      if (index < 0) return false;
      store.blueprints.splice(index, 1);
      return true;
    });
  }
  const connection = await connectMongo();
  if (!connection) {
    return updateLocalStore((store) => {
      const index = store.blueprints.findIndex((blueprint) => blueprint.id === id);
      if (index < 0) return false;
      store.blueprints.splice(index, 1);
      return true;
    });
  }
  if (!mongoose.isValidObjectId(id)) return false;
  return Boolean((await LayoutBlueprintModel.findByIdAndDelete(id)));
}

async function replaceLayout(elements: LayoutElementRecord[]) {
  const normalised = elements.map(({ id: _id, ...element }) => normalise(element));
  await ensureLayout();
  if (!canUseMongo()) {
    const created = normalised.map((element) => ({ ...element, id: randomUUID() }));
    memoryLayout.splice(0, memoryLayout.length, ...created);
    await persistLocalLayout();
    return created;
  }
  const connection = await connectMongo();
  if (!connection) {
    const created = normalised.map((element) => ({ ...element, id: randomUUID() }));
    memoryLayout.splice(0, memoryLayout.length, ...created);
    await persistLocalLayout();
    return created;
  }
  await LayoutElementModel.deleteMany({});
  if (!normalised.length) return [];
  return (await LayoutElementModel.insertMany(normalised)).map(fromDoc);
}

export async function applyLayoutBlueprint(id: string) {
  const blueprint = await findLayoutBlueprint(id);
  if (!blueprint) throw new Error("Blueprint not found.");

  const storedSeats = await getSeatStore();
  const seatIds = new Map<string, string>();
  for (const snapshot of blueprint.seats) {
    const existing = storedSeats.find((seat) => seat.id === snapshot.id || seat.code.toUpperCase() === snapshot.code.toUpperCase());
    const seat = existing ?? await saveSeat({
      code: snapshot.code,
      label: snapshot.label,
      zone: snapshot.zone,
      floor: snapshot.floor,
      status: "AVAILABLE",
      qrVersion: snapshot.qrVersion || 1
    });
    seatIds.set(snapshot.id, seat.id);
  }

  const restored = blueprint.elements
    .filter((element) => element.type !== "SEAT" || (element.seatId && seatIds.has(element.seatId)))
    .map((element) => ({ ...element, seatId: element.seatId ? seatIds.get(element.seatId) : undefined }));
  const elements = await replaceLayout(restored);
  const seats = (await getSeatStore()).filter((seat) => elements.some((element) => element.type === "SEAT" && element.seatId === seat.id));
  return { blueprint, elements, seats };
}
