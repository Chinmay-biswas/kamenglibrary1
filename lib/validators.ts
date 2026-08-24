import { z } from "zod";

const locationSchema = z.object({
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  accuracy: z.number().positive().optional()
});

export const seatScanSchema = z.object({
  token: z.string().min(10),
  location: locationSchema.optional()
});

export const gateScanSchema = z.object({
  token: z.string().min(10),
  location: locationSchema.optional()
});
