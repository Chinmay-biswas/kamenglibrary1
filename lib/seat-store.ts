import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { canUseMongo, connectMongo } from "./mongodb";
import { GeofenceModel } from "@/models/Geofence";
import { SeatChallengeModel } from "@/models/SeatChallenge";
import { SeatModel } from "@/models/Seat";
import { SystemSettingModel } from "@/models/SystemSetting";
import { GeofenceRecord, SeatChallengeRecord, SeatRecord } from "./types";
import { readLocalStore, updateLocalStore } from "./local-store";

// Seats are created from Layout Studio. There is intentionally no starter-seat limit.
const memorySeats: SeatRecord[] = [];

const memoryGeofences: GeofenceRecord[] = [
  {
    id: "g1",
    name: "Main Library",
    latitude: 26.19,
    longitude: 91.69,
    radiusMeters: 250,
    enabled: true,
    appliesToGate: true,
    appliesToSeats: true
  }
];

const memoryChallenges: SeatChallengeRecord[] = [];

function replaceArray<T>(target: T[], values: T[]) {
  target.splice(0, target.length, ...values);
}

async function ensureLocalSeatStore() {
  const store = await readLocalStore();
  if (store.initialized.seats) {
    replaceArray(memorySeats, store.seats);
    replaceArray(memoryGeofences, store.geofences);
    replaceArray(memoryChallenges, store.challenges);
    return;
  }
  await updateLocalStore((next) => {
    next.seats = [...memorySeats];
    next.geofences = [...memoryGeofences];
    next.challenges = [...memoryChallenges];
    next.initialized.seats = true;
  });
}

async function persistLocalSeatStore() {
  await updateLocalStore((next) => {
    next.seats = [...memorySeats];
    next.geofences = [...memoryGeofences];
    next.challenges = [...memoryChallenges];
    next.initialized.seats = true;
  });
}

async function seedIfEmpty() {
  if (!canUseMongo()) return false;
  const seedMarker = await SystemSettingModel.findOne({ key: "default_data_seeded" }).lean();
  if (!seedMarker) {
    const count = await SeatModel.countDocuments();
    if (count === 0 && memorySeats.length) await SeatModel.insertMany(memorySeats);
    const geoCount = await GeofenceModel.countDocuments();
    if (geoCount === 0) await GeofenceModel.create(memoryGeofences[0]);
    await SystemSettingModel.create({ key: "default_data_seeded", value: true });
  }
  return true;
}

function toSeatRecord(doc: any): SeatRecord {
  return {
    id: String(doc._id ?? doc.id),
    code: doc.code,
    label: doc.label,
    status: doc.status,
    qrVersion: doc.qrVersion,
    zone: doc.zone,
    floor: doc.floor,
    assignedTo: doc.assignedTo ? String(doc.assignedTo) : undefined,
    occupiedUntil: doc.occupiedUntil?.toISOString?.() ?? doc.occupiedUntil,
    graceUntil: doc.graceUntil?.toISOString?.() ?? doc.graceUntil
  };
}

function toGeofenceRecord(doc: any): GeofenceRecord {
  return {
    id: String(doc._id ?? doc.id),
    name: doc.name,
    latitude: doc.latitude,
    longitude: doc.longitude,
    radiusMeters: doc.radiusMeters,
    enabled: doc.enabled,
    appliesToGate: doc.appliesToGate,
    appliesToSeats: doc.appliesToSeats
  };
}

function toChallengeRecord(doc: any): SeatChallengeRecord {
  return {
    id: String(doc._id ?? doc.id),
    seatId: String(doc.seatId),
    challengerId: String(doc.challengerId),
    ownerId: String(doc.ownerId),
    status: doc.status,
    createdAt: doc.createdAt.toISOString?.() ?? doc.createdAt,
    expiresAt: doc.expiresAt.toISOString?.() ?? doc.expiresAt
  };
}

function saveSeatInMemory(seat: Partial<SeatRecord> & { id?: string }) {
  const index = memorySeats.findIndex((item) => item.id === seat.id || item.code === seat.code);
  const next: SeatRecord = {
    id: seat.id ?? seat.code ?? randomUUID(),
    code: seat.code ?? seat.id ?? randomUUID(),
    label: seat.label ?? "Seat",
    status: seat.status ?? "AVAILABLE",
    qrVersion: seat.qrVersion ?? 1,
    zone: seat.zone,
    floor: seat.floor,
    assignedTo: seat.assignedTo,
    occupiedUntil: seat.occupiedUntil,
    graceUntil: seat.graceUntil
  };
  if (index >= 0) memorySeats[index] = next;
  else memorySeats.push(next);
  return next;
}

function upsertGeofenceInMemory(next: GeofenceRecord) {
  const index = memoryGeofences.findIndex((item) => item.id === next.id);
  if (index >= 0) memoryGeofences[index] = next;
  else memoryGeofences.push(next);
  return next;
}

function deleteGeofenceInMemory(id: string) {
  const index = memoryGeofences.findIndex((item) => item.id === id);
  if (index >= 0) memoryGeofences.splice(index, 1);
}

export async function getSeatStore() {
  if (!canUseMongo()) { await ensureLocalSeatStore(); return memorySeats; }
  const connection = await connectMongo();
  if (!connection) { await ensureLocalSeatStore(); return memorySeats; }
  await seedIfEmpty();
  const seats = await SeatModel.find().lean();
  return seats.map(toSeatRecord);
}

export async function findSeat(id: string) {
  if (!canUseMongo()) { await ensureLocalSeatStore(); return memorySeats.find((seat) => seat.id === id || seat.code === id); }
  const connection = await connectMongo();
  if (!connection) { await ensureLocalSeatStore(); return memorySeats.find((seat) => seat.id === id || seat.code === id); }
  await seedIfEmpty();
  const filters: Record<string, string>[] = [{ code: id }];
  if (mongoose.isValidObjectId(id)) filters.push({ _id: id });
  const seat = await SeatModel.findOne({ $or: filters });
  return seat ? toSeatRecord(seat) : undefined;
}

export async function saveSeat(seat: Partial<SeatRecord> & { id?: string }) {
  if (!canUseMongo()) {
    await ensureLocalSeatStore(); const saved = saveSeatInMemory(seat); await persistLocalSeatStore(); return saved;
  }
  const connection = await connectMongo();
  if (!connection) { await ensureLocalSeatStore(); const saved = saveSeatInMemory(seat); await persistLocalSeatStore(); return saved; }
  await seedIfEmpty();
  const filters: Record<string, string>[] = [];
  if (seat.id && mongoose.isValidObjectId(seat.id)) filters.push({ _id: seat.id });
  if (seat.id) filters.push({ code: seat.id });
  if (seat.code) filters.push({ code: seat.code });
  const filter = filters.length ? { $or: filters } : { code: randomUUID() };
  const { id: _id, ...values } = seat;
  const updated = await SeatModel.findOneAndUpdate(filter, { $set: values }, { upsert: true, new: true, setDefaultsOnInsert: true });
  return toSeatRecord(updated);
}

export async function deleteSeat(id: string) {
  if (!canUseMongo()) {
    await ensureLocalSeatStore();
    const index = memorySeats.findIndex((seat) => seat.id === id || seat.code === id);
    if (index < 0) return false;
    memorySeats.splice(index, 1);
    await persistLocalSeatStore();
    return true;
  }
  const connection = await connectMongo();
  if (!connection) {
    await ensureLocalSeatStore();
    const index = memorySeats.findIndex((seat) => seat.id === id || seat.code === id);
    if (index < 0) return false;
    memorySeats.splice(index, 1);
    await persistLocalSeatStore();
    return true;
  }
  const filter = mongoose.isValidObjectId(id) ? { _id: id } : { code: id };
  const result = await SeatModel.deleteOne(filter);
  return result.deletedCount > 0;
}

export async function getGeofences() {
  if (!canUseMongo()) { await ensureLocalSeatStore(); return memoryGeofences; }
  const connection = await connectMongo();
  if (!connection) { await ensureLocalSeatStore(); return memoryGeofences; }
  await seedIfEmpty();
  const geofences = await GeofenceModel.find().lean();
  return geofences.map(toGeofenceRecord);
}

export async function upsertGeofence(next: GeofenceRecord) {
  if (!canUseMongo()) {
    await ensureLocalSeatStore();
    const index = memoryGeofences.findIndex((item) => item.id === next.id);
    if (index >= 0) memoryGeofences[index] = next;
    else memoryGeofences.push(next);
    await persistLocalSeatStore();
    return next;
  }
  const connection = await connectMongo();
  if (!connection) { await ensureLocalSeatStore(); const saved = upsertGeofenceInMemory(next); await persistLocalSeatStore(); return saved; }
  const { id: _id, ...values } = next;
  if (mongoose.isValidObjectId(next.id)) {
    const updated = await GeofenceModel.findByIdAndUpdate(next.id, values, { new: true });
    if (updated) return toGeofenceRecord(updated);
  }
  return toGeofenceRecord(await GeofenceModel.create(values));
}

export async function deleteGeofence(id: string) {
  if (!canUseMongo()) {
    await ensureLocalSeatStore();
    const index = memoryGeofences.findIndex((item) => item.id === id);
    if (index >= 0) memoryGeofences.splice(index, 1);
    await persistLocalSeatStore();
    return;
  }
  const connection = await connectMongo();
  if (!connection) { await ensureLocalSeatStore(); deleteGeofenceInMemory(id); await persistLocalSeatStore(); return; }
  if (mongoose.isValidObjectId(id)) await GeofenceModel.deleteOne({ _id: id });
}

export async function getChallenges() {
  if (!canUseMongo()) { await ensureLocalSeatStore(); return memoryChallenges; }
  const connection = await connectMongo();
  if (!connection) { await ensureLocalSeatStore(); return memoryChallenges; }
  await seedIfEmpty();
  const challenges = await SeatChallengeModel.find().lean();
  return challenges.map(toChallengeRecord);
}

export async function addChallenge(next: SeatChallengeRecord) {
  if (!canUseMongo()) {
    await ensureLocalSeatStore();
    memoryChallenges.push(next);
    await persistLocalSeatStore();
    return next;
  }
  const connection = await connectMongo();
  if (!connection) {
    await ensureLocalSeatStore();
    memoryChallenges.push(next);
    await persistLocalSeatStore();
    return next;
  }
  const created = await SeatChallengeModel.create({
    seatId: next.seatId,
    challengerId: next.challengerId,
    ownerId: next.ownerId,
    status: next.status,
    expiresAt: next.expiresAt,
    createdAt: next.createdAt
  });
  return toChallengeRecord(created);
}

export async function findChallenge(id: string) {
  if (!canUseMongo()) { await ensureLocalSeatStore(); return memoryChallenges.find((item) => item.id === id); }
  const connection = await connectMongo();
  if (!connection) { await ensureLocalSeatStore(); return memoryChallenges.find((item) => item.id === id); }
  const challenge = await SeatChallengeModel.findById(id);
  return challenge ? toChallengeRecord(challenge) : undefined;
}

export async function saveChallenge(next: SeatChallengeRecord) {
  if (!canUseMongo()) {
    await ensureLocalSeatStore();
    const index = memoryChallenges.findIndex((item) => item.id === next.id);
    if (index >= 0) memoryChallenges[index] = next;
    await persistLocalSeatStore();
    return next;
  }
  const connection = await connectMongo();
  if (!connection) {
    await ensureLocalSeatStore();
    const index = memoryChallenges.findIndex((item) => item.id === next.id);
    if (index >= 0) memoryChallenges[index] = next;
    await persistLocalSeatStore();
    return next;
  }
  const updated = await SeatChallengeModel.findByIdAndUpdate(
    next.id,
    {
      seatId: next.seatId,
      challengerId: next.challengerId,
      ownerId: next.ownerId,
      status: next.status,
      expiresAt: next.expiresAt
    },
    { new: true }
  );
  return updated ? toChallengeRecord(updated) : undefined;
}

export async function createChallengeId() {
  return randomUUID();
}
