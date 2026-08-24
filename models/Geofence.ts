import { Schema, model, models } from "mongoose";

const geofenceSchema = new Schema(
  {
    name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radiusMeters: { type: Number, required: true },
    enabled: { type: Boolean, default: true },
    appliesToGate: { type: Boolean, default: true },
    appliesToSeats: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const GeofenceModel = models.Geofence || model("Geofence", geofenceSchema);
