import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    microsoftId: { type: String, unique: true, sparse: true },
    provider: { type: String, enum: ["microsoft-entra-id", "google"] },
    providerAccountId: { type: String },
    email: { type: String, unique: true, required: true },
    name: { type: String },
    rollNo: { type: String },
    hostelRoomNo: { type: String },
    phoneNumber: { type: String },
    profileCompleted: { type: Boolean, default: false },
    role: { type: String, enum: ["STUDENT", "ADMIN", "SUPER_ADMIN"], default: "STUDENT" }
  },
  { timestamps: true }
);

export const UserModel = models.User || model("User", userSchema);
