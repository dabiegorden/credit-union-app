import mongoose, { Schema, Document } from "mongoose";

export interface ISavings extends Document {
  memberId: mongoose.Types.ObjectId;
  transactionType: "deposit" | "withdrawal";
  amount: number;
  balanceAfter: number;
  recordedBy: mongoose.Types.ObjectId;
  description?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsSchema = new Schema<ISavings>(
  {
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
      required: [true, "Balance after is required"],
      min: 0,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Staff member who recorded is required"],
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

export default mongoose.models.Savings ||
  mongoose.model<ISavings>("Savings", SavingsSchema);
