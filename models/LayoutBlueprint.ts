import { Schema, model, models } from "mongoose";

const layoutBlueprintSchema = new Schema(
  {
    name: { type: String, unique: true, required: true, trim: true },
    elements: { type: [Schema.Types.Mixed], default: [] },
    seats: { type: [Schema.Types.Mixed], default: [] }
  },
  { timestamps: true }
);

export const LayoutBlueprintModel = models.LayoutBlueprint || model("LayoutBlueprint", layoutBlueprintSchema);
