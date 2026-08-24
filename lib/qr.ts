import { createHmac, timingSafeEqual } from "crypto";

export type SignedQrPayload = {
  type: "GATE" | "SEAT";
  version: number;
  seatId?: string;
  issuedAt?: number;
};

function signingSecret() {
  // Local previews remain usable, while deployed installations must set their own secret.
  if (process.env.QR_SIGNING_SECRET) return process.env.QR_SIGNING_SECRET;
  if (process.env.NODE_ENV !== "production") return "kameng-local-development-qr-secret";
  throw new Error("QR_SIGNING_SECRET must be configured before generating production QR codes.");
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(encodedPayload: string) {
  return createHmac("sha256", signingSecret()).update(encodedPayload).digest("base64url");
}

export function signQrPayload(payload: SignedQrPayload) {
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${signature(encodedPayload)}`;
}

export function verifyQrPayload(token: string): SignedQrPayload | null {
  const [encodedPayload, receivedSignature, ...extra] = token.split(".");
  if (!encodedPayload || !receivedSignature || extra.length) return null;
  const expectedSignature = signature(encodedPayload);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const payload = JSON.parse(decode(encodedPayload)) as SignedQrPayload;
    if (!payload || !["GATE", "SEAT"].includes(payload.type) || !Number.isInteger(payload.version)) return null;
    if (payload.type === "SEAT" && !payload.seatId) return null;
    return payload;
  } catch {
    return null;
  }
}

export function extractQrToken(value: string) {
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.searchParams.get("token") ?? trimmed;
  } catch {
    return trimmed;
  }
}

export function buildSeatQrPayload(seatId: string, version: number) {
  // The printed token must remain stable until its version is explicitly rotated.
  return signQrPayload({ type: "SEAT", seatId, version });
}

export function buildGateQrPayload(version = 1) {
  return signQrPayload({ type: "GATE", version });
}

export function buildQrScanUrl(token: string, mode?: "gate" | "seat") {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const modeQuery = mode ? `&mode=${mode}` : "";
  return `${origin}/scan?token=${encodeURIComponent(token)}${modeQuery}`;
}
