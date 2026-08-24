import { Schema, model, models } from "mongoose";

const libraryVisitSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

export const LibraryVisitModel = models.LibraryVisit || model("LibraryVisit", libraryVisitSchema);
