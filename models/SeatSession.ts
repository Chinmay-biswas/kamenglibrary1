import { Schema, model, models } from "mongoose";

const seatSessionSchema = new Schema(
  {
    seatId: { type: Schema.Types.ObjectId, ref: "Seat", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    graceUntil: { type: Date }
  },
  { timestamps: true }
);

export const SeatSessionModel = models.SeatSession || model("SeatSession", seatSessionSchema);
