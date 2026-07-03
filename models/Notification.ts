import mongoose, { Schema, Document } from "mongoose";

export type NotificationType =
  | "deposit"
  | "withdrawal"
  | "verification"
  | "approval"
  | "account"
  | "general";

// A notification can be addressed either to a Client (portal member) or to a
// User (staff/admin). We store which collection the recipient lives in so the
// notification bell can query the right owner.
export type RecipientModel = "Client" | "User";

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  recipientModel: RecipientModel;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "recipientModel",
    },
    recipientModel: {
      type: String,
      enum: ["Client", "User"],
      required: true,
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "verification", "approval", "account", "general"],
      default: "general",
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
