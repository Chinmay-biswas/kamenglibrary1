import { Schema, model, models } from "mongoose";

const occupancySnapshotSchema = new Schema(
  {
    occupied: { type: Number, required: true },
    free: { type: Number, required: true },
    grace: { type: Number, required: true },
    takenAt: { type: Date, required: true }
  },
  { timestamps: true }
);

export const OccupancySnapshotModel = models.OccupancySnapshot || model("OccupancySnapshot", occupancySnapshotSchema);
