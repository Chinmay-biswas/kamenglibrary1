import { Schema, model, models } from "mongoose";

const pushSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  { timestamps: true }
);

export const PushSubscriptionModel = models.PushSubscription || model("PushSubscription", pushSubscriptionSchema);
