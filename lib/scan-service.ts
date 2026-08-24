import { addNotification } from "./notification-service";
import { createSeatChallenge, currentSeatForUser, expireSeatChallenges, findOperationalSeat, getActiveGeofences, getPendingChallengeForSeat, occupySeat, resolveChallenge } from "./seat-service";
import { validateGateScan, validateSeatScan } from "./gate-service";
import { extractQrToken, verifyQrPayload } from "./qr";
import { findAuthUserById } from "./user-service";
import { createOrRefreshVisit } from "./visit-service";

export type ScanLocation = { latitude: number; longitude: number; accuracy?: number };

async function checkLocation(location: ScanLocation | undefined, forGate: boolean) {
  const geofences = await getActiveGeofences();
  if (!geofences.length) return { inside: true };
  if (!location) throw new Error("Location permission is required to verify that you are inside the library.");
  const result = forGate
    ? await validateGateScan(location.latitude, location.longitude)
    : await validateSeatScan(location.latitude, location.longitude);
  if (!result.inside) throw new Error("Your location is outside the configured library area.");
  return result;
}

export async function processGateScan(userId: string, rawToken: string, location?: ScanLocation) {
  const payload = verifyQrPayload(extractQrToken(rawToken));
  if (!payload || payload.type !== "GATE") throw new Error("This is not a valid Kameng Library gate QR code.");
  await checkLocation(location, true);
  const visit = await createOrRefreshVisit(userId);
  return { visit, message: "Library visit confirmed. You can now scan an available seat." };
}

export async function processSeatScan(userId: string, rawToken: string, location?: ScanLocation) {
  const payload = verifyQrPayload(extractQrToken(rawToken));
  if (!payload || payload.type !== "SEAT" || !payload.seatId) throw new Error("This is not a valid Kameng Library seat QR code.");
  await expireSeatChallenges();
  const seat = await findOperationalSeat(payload.seatId);
  if (!seat || seat.qrVersion !== payload.version) throw new Error("This QR label is no longer current. Please use the latest printed label.");

  const currentSeat = await currentSeatForUser(userId);
  if (currentSeat && currentSeat.id !== seat.id) throw new Error(`You already have ${currentSeat.code}. Release it before taking another seat.`);
  await checkLocation(location, false);
  if (currentSeat?.id === seat.id && seat.status === "OCCUPIED") {
    const pendingChallenge = await getPendingChallengeForSeat(seat.id);
    if (pendingChallenge?.ownerId === userId) {
      await resolveChallenge(pendingChallenge.id, "RETURN");
      await addNotification(pendingChallenge.challengerId, "Attendance check resolved", `${seat.code}'s owner scanned the seat QR and kept the reservation.`);
      return { type: "SEAT" as const, seat, message: `${seat.code} attendance confirmed. Your reservation remains active.` };
    }
    return { type: "SEAT" as const, seat, message: `${seat.code} is already reserved for you.` };
  }
  if (seat.status === "OCCUPIED" && seat.assignedTo && seat.assignedTo !== userId) {
    const challenge = await createSeatChallenge(seat.id, userId);
    const owner = await findAuthUserById(seat.assignedTo);
    const ownerSummary = {
      name: owner?.name || "Current seat holder",
      rollNo: owner?.rollNo || undefined,
      hostelRoomNo: owner?.hostelRoomNo || undefined,
      phoneNumber: owner?.phoneNumber || undefined
    };
    await addNotification(seat.assignedTo, "Seat attendance check", `Someone reported ${seat.code} as empty. Scan its QR within 15 minutes to keep your seat.`);
    return {
      type: "CHALLENGE" as const,
      seat,
      challenge,
      owner: ownerSummary,
      message: `A 15-minute attendance check was opened for ${seat.code}. The seat transfers to you if its owner does not return in time.`
    };
  }
  const updatedSeat = await occupySeat(seat.id, userId);
  return { type: "SEAT" as const, seat: updatedSeat, message: `${updatedSeat.code} is now reserved for two hours.` };
}
