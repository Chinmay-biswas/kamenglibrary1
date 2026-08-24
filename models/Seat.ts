import { Schema, model, models } from "mongoose";

const seatSchema = new Schema(
  {
    code: { type: String, unique: true, required: true },
    label: { type: String, required: true },
    zone: { type: String },
    floor: { type: String },
    status: { type: String, enum: ["AVAILABLE", "OCCUPIED", "GRACE", "MAINTENANCE", "DISABLED"], default: "AVAILABLE" },
    qrVersion: { type: Number, default: 1 },
    assignedTo: { type: String },
    occupiedUntil: { type: Date },
    graceUntil: { type: Date }
  },
  { timestamps: true }
);

export const SeatModel = models.Seat || model("Seat", seatSchema);
