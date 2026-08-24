import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const RETRY_COOLDOWN_MS = 15_000;
let retryAfter = 0;

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: Cached | undefined;
}

const cached: Cached = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

export async function connectMongo() {
  if (!MONGODB_URI || Date.now() < retryAfter) return null;
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 }).catch((error) => {
      retryAfter = Date.now() + RETRY_COOLDOWN_MS;
      cached.promise = null;
      cached.conn = null;
      return Promise.reject(error);
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch {
    retryAfter = Date.now() + RETRY_COOLDOWN_MS;
    cached.promise = null;
    cached.conn = null;
    return null;
  }
  retryAfter = 0;
  return cached.conn;
}

export function canUseMongo() {
  return Boolean(MONGODB_URI) && Date.now() >= retryAfter;
}
