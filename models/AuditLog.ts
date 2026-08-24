import { Schema, model, models } from "mongoose";

const auditLogSchema = new Schema(
  {
    action: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

export const AuditLogModel = models.AuditLog || model("AuditLog", auditLogSchema);
