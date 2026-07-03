import mongoose, { Schema, Document } from "mongoose";

export type ApprovalAction =
  | "client_edit"
  | "client_delete"
  | "report_export"
  | "statement_print";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface IApprovalRequest extends Document {
  action: ApprovalAction;
  status: ApprovalStatus;
  requestedBy: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  // Target of the request, e.g. a client being edited/deleted
  targetId?: mongoose.Types.ObjectId;
  targetLabel?: string;
  // Proposed changes (client_edit) or report parameters (report_export)
  payload?: Record<string, unknown>;
  reason?: string;
  reviewNote?: string;
  reviewedAt?: Date;
  // For report_export: marks the approval as consumed once staff has exported
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalRequestSchema = new Schema<IApprovalRequest>(
  {
    action: {
      type: String,
      enum: ["client_edit", "client_delete", "report_export", "statement_print"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    targetId: { type: Schema.Types.ObjectId },
    targetLabel: { type: String },
    payload: { type: Schema.Types.Mixed },
    reason: { type: String },
    reviewNote: { type: String },
    reviewedAt: { type: Date },
    used: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ApprovalRequestSchema.index({ status: 1, createdAt: -1 });
ApprovalRequestSchema.index({ requestedBy: 1, createdAt: -1 });

export default mongoose.models.ApprovalRequest ||
  mongoose.model<IApprovalRequest>("ApprovalRequest", ApprovalRequestSchema);
