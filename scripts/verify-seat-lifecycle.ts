import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

process.env.MONGODB_URI = "";
process.env.QR_SIGNING_SECRET = "seat-lifecycle-test-secret";
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_FROM;

async function main() {
  const originalWorkingDirectory = process.cwd();
  const testRoot = await mkdtemp(path.join(os.tmpdir(), "kameng-seat-lifecycle-"));
  process.chdir(testRoot);

  try {
    const { addChallenge, saveSeat, findSeat } = await import("../lib/seat-store");
    const { createLayoutElement, listLayoutElements } = await import("../lib/layout-service");
    const { advanceSeatStates, listSeats } = await import("../lib/seat-service");
    const { processSeatScan } = await import("../lib/scan-service");
    const { buildSeatQrPayload } = await import("../lib/qr");
    const { listNotifications } = await import("../lib/notification-service");

    const ownerId = "owner@example.com";
    const challengerId = "challenger@example.com";
    const expiredAt = Date.now() - 1000;
    const scannedSeat = await saveSeat({
      id: "lifecycle-seat",
      code: "A-901",
      label: "Lifecycle test seat",
      status: "OCCUPIED",
      qrVersion: 1,
      assignedTo: ownerId,
      occupiedUntil: new Date(expiredAt).toISOString()
    });

    await listLayoutElements();
    const transitions = await advanceSeatStates();
    assert.equal(transitions.length, 1);
    assert.equal(transitions[0].type, "GRACE_STARTED");

    const inGrace = await findSeat(scannedSeat.id);
    assert.equal(inGrace?.status, "GRACE");
    assert.equal(inGrace?.assignedTo, ownerId);
    assert.ok(inGrace?.graceUntil);
    assert.ok(Math.abs(Date.parse(inGrace!.graceUntil!) - (expiredAt + 10 * 60 * 1000)) < 2000);
    assert.ok((await listNotifications(ownerId)).some((note) => note.title === "Re-scan your seat to keep it"));

    await saveSeat({ ...inGrace!, graceUntil: new Date(Date.now() - 1000).toISOString() });
    await advanceSeatStates();
    const released = await findSeat(scannedSeat.id);
    assert.equal(released?.status, "AVAILABLE");
    assert.equal(released?.assignedTo, undefined);
    assert.ok((await listNotifications(ownerId)).some((note) => note.title === "Seat reservation released"));

    const lateSeat = await saveSeat({
      id: "late-seat",
      code: "A-903",
      label: "Late scheduler test seat",
      status: "OCCUPIED",
      qrVersion: 1,
      assignedTo: ownerId,
      occupiedUntil: new Date(Date.now() - (11 * 60 * 1000)).toISOString()
    });
    const lateTransitions = await advanceSeatStates();
    assert.ok(lateTransitions.some((transition) => transition.seatId === lateSeat.id && transition.type === "RELEASED"));
    assert.equal((await findSeat(lateSeat.id))?.status, "AVAILABLE");

    const occupiedSeat = await saveSeat({
      id: "challenge-seat",
      code: "A-902",
      label: "Challenge test seat",
      status: "OCCUPIED",
      qrVersion: 1,
      assignedTo: ownerId,
      occupiedUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    });
    await createLayoutElement({ type: "SEAT", x: 20, y: 20, width: 6, height: 8, seatId: occupiedSeat.id, label: occupiedSeat.code });
    const scanResult = await processSeatScan(
      challengerId,
      buildSeatQrPayload(occupiedSeat.id, occupiedSeat.qrVersion),
      { latitude: 26.19, longitude: 91.69 }
    );
    assert.equal(scanResult.type, "CHALLENGE");
    assert.ok((await listNotifications(ownerId)).some((note) => note.title === "Seat attendance check"));

    const transferOwnerId = "transfer-owner@example.com";
    const transferChallengerId = "transfer-challenger@example.com";
    const transferSeat = await saveSeat({
      id: "transfer-seat",
      code: "A-904",
      label: "Transfer test seat",
      status: "OCCUPIED",
      qrVersion: 1,
      assignedTo: transferOwnerId,
      occupiedUntil: new Date(Date.now() - (20 * 60 * 1000)).toISOString()
    });
    await addChallenge({
      id: "expired-transfer-challenge",
      seatId: transferSeat.id,
      ownerId: transferOwnerId,
      challengerId: transferChallengerId,
      status: "PENDING",
      createdAt: new Date(Date.now() - (16 * 60 * 1000)).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString()
    });
    await listSeats();
    const transferred = await findSeat(transferSeat.id);
    assert.equal(transferred?.status, "OCCUPIED");
    assert.equal(transferred?.assignedTo, transferChallengerId);
    assert.ok((await listNotifications(transferChallengerId)).some((note) => note.title === "Seat reserved for you"));

    console.log("Seat lifecycle verification passed.");
  } finally {
    process.chdir(originalWorkingDirectory);
    await rm(testRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
