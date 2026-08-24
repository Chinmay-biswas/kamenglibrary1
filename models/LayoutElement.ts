import { Schema, model, models } from "mongoose";

const layoutElementSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["ROOM", "SEAT", "WALL", "DOOR", "TABLE", "PILLAR", "LABEL"],
      required: true
    },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    rotation: { type: Number, default: 0 },
    label: { type: String },
    seatId: { type: String },
    floor: { type: String },
    zone: { type: String },
    color: { type: String },
    locked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const LayoutElementModel = models.LayoutElement || model("LayoutElement", layoutElementSchema);
