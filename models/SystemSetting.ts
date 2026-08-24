import { Schema, model, models } from "mongoose";

const systemSettingSchema = new Schema(
  {
    key: { type: String, unique: true, required: true },
    value: { type: Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

export const SystemSettingModel = models.SystemSetting || model("SystemSetting", systemSettingSchema);
