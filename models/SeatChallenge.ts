import { Schema, model, models } from "mongoose";

const seatChallengeSchema = new Schema(
  {
    seatId: { type: Schema.Types.ObjectId, ref: "Seat", required: true },
    challengerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["PENDING", "RESOLVED", "EXPIRED", "CANCELLED"], default: "PENDING" },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

export const SeatChallengeModel = models.SeatChallenge || model("SeatChallenge", seatChallengeSchema);
