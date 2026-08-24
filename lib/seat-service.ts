import { randomUUID } from "crypto";
import { alertUser } from "./alert-service";
import { addChallenge, findChallenge, findSeat, getChallenges, getGeofences, getSeatStore, saveChallenge, saveSeat } from "./seat-store";
import { listLayoutElements } from "./layout-service";
import { LibraryStats, SeatRecord } from "./types";

const TWO_HOURS = 2 * 60 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;
export const SEAT_CHALLENGE_DURATION_MS = 15 * 60 * 1000;

export type SeatStateTransition = {
  type: "GRACE_STARTED" | "RELEASED";
  seatId: string;
  code: string;
  ownerId?: string;
  graceUntil?: string;
};

function validTime(value?: string) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

async function alertForSeatTransition(transition: SeatStateTransition) {
  if (!transition.ownerId) return;
  try {
    if (transition.type === "GRACE_STARTED") {
      const deadline = transition.graceUntil
        ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date(transition.graceUntil))
        : "the grace-period deadline";
      await alertUser(
        transition.ownerId,
        "Re-scan your seat to keep it",
        `Your two-hour reservation for ${transition.code} has ended. Scan the same printed Seat QR before ${deadline} to renew it for another two hours.`
      );
      return;
    }

    await alertUser(
      transition.ownerId,
      "Seat reservation released",
      `The grace period for ${transition.code} ended without a re-scan, so the seat is available to other students now.`
    );
  } catch (error) {
    // A delivery issue must never leave a seat stuck in its previous state.
    console.error("Kameng Library seat alert could not be delivered.", error);
  }
}

async function refreshSeatState(seat: SeatRecord, now = Date.now()): Promise<SeatStateTransition | undefined> {
  const occupiedUntil = validTime(seat.occupiedUntil);
  if (seat.status === "OCCUPIED" && occupiedUntil !== undefined && occupiedUntil <= now) {
    const graceDeadline = occupiedUntil + TEN_MINUTES;
    if (graceDeadline > now) {
      seat.status = "GRACE";
      seat.graceUntil = new Date(graceDeadline).toISOString();
      seat.occupiedUntil = undefined;
      const saved = await saveSeat(seat);
      return { type: "GRACE_STARTED", seatId: saved.id, code: saved.code, ownerId: saved.assignedTo, graceUntil: saved.graceUntil };
    }

    const ownerId = seat.assignedTo;
    seat.status = "AVAILABLE";
    seat.assignedTo = undefined;
    seat.occupiedUntil = undefined;
    seat.graceUntil = undefined;
    const saved = await saveSeat(seat);
    return { type: "RELEASED", seatId: saved.id, code: saved.code, ownerId };
  }

  const graceUntil = validTime(seat.graceUntil);
  if (seat.status === "GRACE" && graceUntil !== undefined && graceUntil <= now) {
    const ownerId = seat.assignedTo;
    seat.status = "AVAILABLE";
    seat.assignedTo = undefined;
    seat.occupiedUntil = undefined;
    seat.graceUntil = undefined;
    const saved = await saveSeat(seat);
    return { type: "RELEASED", seatId: saved.id, code: saved.code, ownerId };
  }
}

let seatStateAdvancePromise: Promise<SeatStateTransition[]> | undefined;

export async function advanceSeatStates() {
  if (seatStateAdvancePromise) return seatStateAdvancePromise;

  seatStateAdvancePromise = (async () => {
    const transitions: SeatStateTransition[] = [];
    const now = Date.now();
    for (const seat of await getSeatStore()) {
      const transition = await refreshSeatState(seat, now);
      if (transition) transitions.push(transition);
    }
    await Promise.all(transitions.map((transition) => alertForSeatTransition(transition)));
    return transitions;
  })().finally(() => {
    seatStateAdvancePromise = undefined;
  });

  return seatStateAdvancePromise;
}

export async function listSeats() {
  // Resolve a waiting student's expired attendance check before ordinary expiry can release the seat.
  await expireSeatChallenges();
  await advanceSeatStates();

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

export async function occupySeat(seatId: string, userId: string, options?: { skipStateAdvance?: boolean }) {
  if (!options?.skipStateAdvance) await advanceSeatStates();
  const seat = await findSeat(seatId);
  if (!seat) throw new Error("Seat not found");
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
  if (existing) return { challenge: existing, created: false };
  const challenge = await addChallenge({
    id: randomUUID(),
    seatId,
    challengerId,
    ownerId,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SEAT_CHALLENGE_DURATION_MS).toISOString()
  });
  return { challenge, created: true };
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
    const seatCode = seat?.code ?? "The seat";
    if (seat?.assignedTo === challenge.ownerId) {
      await releaseSeat(seat.id);
      try {
        await occupySeat(seat.id, challenge.challengerId, { skipStateAdvance: true });
        transferred = true;
      } catch {
        // If the challenger already has another seat, the original seat stays available.
      }
    }
    challenge.status = transferred ? "RESOLVED" : "EXPIRED";
    await saveChallenge(challenge);
    if (transferred) {
      await Promise.all([
        alertUser(challenge.challengerId, "Seat reserved for you", `${seatCode} is now reserved for you because its holder did not return during the attendance check.`),
        alertUser(challenge.ownerId, "Seat reservation transferred", `${seatCode} was released because its attendance check ended without a return scan.`)
      ]);
    } else {
      await alertUser(challenge.challengerId, "Attendance check ended", `${seatCode} was not transferred to you. Check the live availability map for another seat.`);
    }
    expired.push(challenge);
  }
  return expired;
}
