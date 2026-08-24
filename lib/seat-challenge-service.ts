import { randomUUID } from "crypto";
import { addChallenge, findChallenge } from "./seat-store";

export async function startChallenge(seatId: string, challengerId: string, ownerId: string) {
  return addChallenge({
    id: randomUUID(),
    seatId,
    challengerId,
    ownerId,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  });
}

export async function cancelChallenge(id: string) {
  const challenge = await findChallenge(id);
  if (challenge) challenge.status = "CANCELLED";
  return challenge;
}
