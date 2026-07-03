import mongoose, { Schema, Document } from "mongoose";

export type ActivityAction =
  | "deposit"
  | "withdrawal"
  | "account_open"
  | "client_register"
  | "loan_disburse"
  | "loan_repayment"
  | "statement_print"
  | "client_edit"
  | "client_delete";

export interface IActivityLog extends Document {
  staff: mongoose.Types.ObjectId; // User who performed the action
  action: ActivityAction;
  amount?: number;
  targetClient?: mongoose.Types.ObjectId;
  targetLabel?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    staff: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: [
        "deposit",
        "withdrawal",
        "account_open",
        "client_register",
        "loan_disburse",
        "loan_repayment",
        "statement_print",
        "client_edit",
        "client_delete",
      ],
      required: true,
    },
    amount: { type: Number },
    targetClient: { type: Schema.Types.ObjectId, ref: "Client" },
    targetLabel: { type: String },
    description: { type: String },
  },
  { timestamps: true },
);

ActivityLogSchema.index({ staff: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
