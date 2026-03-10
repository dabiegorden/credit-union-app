import mongoose, { Schema, Document } from "mongoose";

export type TransactionType = "deposit" | "withdrawal";

export interface ISavingsTransaction extends Document {
  accountId: mongoose.Types.ObjectId; // SavingsAccount ref
  memberId: mongoose.Types.ObjectId; // Member ref (denormalized for fast queries)
  transactionType: TransactionType;
  amount: number;
  balanceAfter: number;
  recordedBy: mongoose.Types.ObjectId; // User (admin | staff | member self-deposit)
  description?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsTransactionSchema = new Schema<ISavingsTransaction>(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SavingsAccount",
      required: [true, "Account ID is required"],
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member ID is required"],
    },
    transactionType: {
      type: String,
      enum: ["deposit", "withdrawal"],
      required: [true, "Transaction type is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    balanceAfter: {
      type: Number,
      required: [true, "Balance after transaction is required"],
      min: 0,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recorded by is required"],
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Index for fast per-member and per-account queries
SavingsTransactionSchema.index({ accountId: 1, date: -1 });
SavingsTransactionSchema.index({ memberId: 1, date: -1 });

export default mongoose.models.SavingsTransaction ||
  mongoose.model<ISavingsTransaction>(
    "SavingsTransaction",
    SavingsTransactionSchema,
  );
