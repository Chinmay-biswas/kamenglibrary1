import { randomUUID } from "crypto";
import { addChallenge, findChallenge, findSeat, getChallenges, getGeofences, getSeatStore, saveChallenge, saveSeat } from "./seat-store";
import { listLayoutElements } from "./layout-service";
import { LibraryStats, SeatRecord } from "./types";

const TWO_HOURS = 2 * 60 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;
export const SEAT_CHALLENGE_DURATION_MS = 15 * 60 * 1000;

async function refreshSeatState(seat: SeatRecord) {
  const now = Date.now();
  if (seat.occupiedUntil && Date.parse(seat.occupiedUntil) <= now) {
    seat.status = "GRACE";
    seat.graceUntil = new Date(now + TEN_MINUTES).toISOString();
    seat.occupiedUntil = undefined;
    await saveSeat(seat);
  }
  if (seat.graceUntil && Date.parse(seat.graceUntil) <= now) {
    seat.status = "AVAILABLE";
    seat.graceUntil = undefined;
    seat.assignedTo = undefined;
    await saveSeat(seat);
  }
}

export async function listSeats() {
  const records = await getSeatStore();
  for (const seat of records) await refreshSeatState(seat);

  // A seat is operational only while it has a matching placement on the floor plan.
  const placedSeatIds = new Set(
    (await listLayoutElements())
      .filter((element) => element.type === "SEAT" && element.seatId)
      .map((element) => element.seatId)
  );
  return (await getSeatStore()).filter((seat) => placedSeatIds.has(seat.id));
}

export async function findOperationalSeat(id: string) {
  return (await listSeats()).find((seat) => seat.id === id || seat.code === id);
}

export async function getStats(): Promise<LibraryStats> {
  const seats = await listSeats();
  const stats: LibraryStats = { total: 0, free: 0, occupied: 0, grace: 0, maintenance: 0, disabled: 0 };
  for (const seat of seats) {
    stats.total += 1;
    switch (seat.status) {
      case "AVAILABLE":
        stats.free += 1;
        break;
      case "OCCUPIED":
        stats.occupied += 1;
        break;
      case "GRACE":
        stats.grace += 1;
        break;
      case "MAINTENANCE":
        stats.maintenance += 1;
        break;
      case "DISABLED":
        stats.disabled += 1;
        break;
    }
  }
  return stats;
}

export async function occupySeat(seatId: string, userId: string) {
  const seat = await findSeat(seatId);
  if (!seat) throw new Error("Seat not found");
  await refreshSeatState(seat);
  if (seat.status !== "AVAILABLE" && !(seat.status === "GRACE" && seat.assignedTo === userId)) {
    throw new Error("Seat is not available");
  }
  seat.status = "OCCUPIED";
  seat.assignedTo = userId;
  seat.occupiedUntil = new Date(Date.now() + TWO_HOURS).toISOString();
  seat.graceUntil = undefined;
  return saveSeat(seat);
}

export async function releaseSeat(seatId: string, userId?: string) {
  const seat = await findSeat(seatId);
  if (!seat) throw new Error("Seat not found");
  if (userId && seat.assignedTo && seat.assignedTo !== userId) {
    throw new Error("Not seat owner");
  }
  seat.status = "AVAILABLE";
  seat.assignedTo = undefined;
  seat.occupiedUntil = undefined;
  seat.graceUntil = undefined;
  return saveSeat(seat);
}

export async function seatLayout() {
  return await listSeats();
}

export async function currentSeatForUser(userId: string) {
  const seats = await listSeats();
  return seats.find((seat) => seat.assignedTo === userId);
}

export async function createSeatChallenge(seatId: string, challengerId: string) {
  const seat = await findSeat(seatId);
  if (!seat) throw new Error("Seat not found");
  const ownerId = seat.assignedTo;
  if (!ownerId) throw new Error("Seat has no owner");
  const existing = (await getChallenges()).find((challenge) => challenge.seatId === seatId && challenge.status === "PENDING" && Date.parse(challenge.expiresAt) > Date.now());
  if (existing) return existing;
  return addChallenge({
    id: randomUUID(),
    seatId,
    challengerId,
    ownerId,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SEAT_CHALLENGE_DURATION_MS).toISOString()
  });
}

export async function resolveChallenge(id: string, outcome: "TRANSFER" | "RETURN" | "EXPIRE" | "CANCEL") {
  const challenge = await findChallenge(id);
  if (!challenge) throw new Error("Challenge not found");
  challenge.status = outcome === "TRANSFER" || outcome === "RETURN" ? "RESOLVED" : outcome === "EXPIRE" ? "EXPIRED" : "CANCELLED";
  return await saveChallenge(challenge);
}

export async function getActiveGeofences() {
  return (await getGeofences()).filter((item) => item.enabled);
}

export async function getChallengesList() {
  return await getChallenges();
}

export async function getPendingChallengeForSeat(seatId: string) {
  return (await getChallenges()).find((challenge) => challenge.seatId === seatId && challenge.status === "PENDING" && Date.parse(challenge.expiresAt) > Date.now());
}

export async function expireSeatChallenges() {
  const expired = [];
  for (const challenge of await getChallenges()) {
    if (challenge.status !== "PENDING" || Date.parse(challenge.expiresAt) > Date.now()) continue;
    const seat = await findSeat(challenge.seatId);
    let transferred = false;
    if (seat?.assignedTo === challenge.ownerId) {
      await releaseSeat(seat.id);
      try {
        await occupySeat(seat.id, challenge.challengerId);
        transferred = true;
      } catch {
        // If the challenger already has another seat, the original seat stays available.
      }
    }
    challenge.status = transferred ? "RESOLVED" : "EXPIRED";
    await saveChallenge(challenge);
    expired.push(challenge);
  }
  return expired;
}
