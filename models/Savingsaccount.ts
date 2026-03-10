import mongoose, { Schema, Document } from "mongoose";

export type AccountType = "regular" | "fixed" | "susu";
export type AccountStatus = "active" | "dormant" | "closed";

export interface ISavingsAccount extends Document {
  accountNumber: string; // auto-generated e.g. SAV-00001
  memberId: mongoose.Types.ObjectId;
  accountType: AccountType;
  accountName: string; // display label e.g. "Regular Savings"
  balance: number;
  status: AccountStatus;
  openedBy: mongoose.Types.ObjectId; // staff/admin who opened it
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsAccountSchema = new Schema<ISavingsAccount>(
  {
    accountNumber: {
      type: String,
      unique: true,
      // set by pre-save hook
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member is required"],
    },
    accountType: {
      type: String,
      enum: ["regular", "fixed", "susu"],
      default: "regular",
    },
    accountName: {
      type: String,
      trim: true,
      default: "Regular Savings",
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "dormant", "closed"],
      default: "active",
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Opened by is required"],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

// Auto-generate accountNumber before first save
SavingsAccountSchema.pre("save", async function () {
  if (!this.accountNumber) {
    const count = await mongoose.model("SavingsAccount").countDocuments();
    this.accountNumber = `SAV-${String(count + 1).padStart(5, "0")}`;
  }
});

export default mongoose.models.SavingsAccount ||
  mongoose.model<ISavingsAccount>("SavingsAccount", SavingsAccountSchema);
