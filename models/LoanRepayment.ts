import mongoose, { Schema, Document } from "mongoose";

export type RepaymentMethod =
  | "cash"
  | "savings_deduction"
  | "bank_transfer"
  | "mobile_money";

export interface ILoanRepayment extends Document {
  repaymentId: string; // auto e.g. RPY-00001
  loanId: mongoose.Types.ObjectId; // ref: Loan
  memberId: mongoose.Types.ObjectId; // denormalized — ref: Member
  amount: number; // total amount paid this repayment
  principalPortion: number; // how much went to principal
  interestPortion: number; // how much went to interest
  penaltyPortion: number; // how much went to penalty clearance
  outstandingBalanceBefore: number; // loan outstanding before this payment
  outstandingBalanceAfter: number; // loan outstanding after this payment
  paymentDate: Date;
  method: RepaymentMethod;
  reference?: string; // e.g. mobile money ref
  recordedBy: mongoose.Types.ObjectId; // User who recorded
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LoanRepaymentSchema = new Schema<ILoanRepayment>(
  {
    repaymentId: {
      type: String,
      unique: true,
    },
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan",
      required: [true, "Loan ID is required"],
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member ID is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    principalPortion: { type: Number, default: 0, min: 0 },
    interestPortion: { type: Number, default: 0, min: 0 },
    penaltyPortion: { type: Number, default: 0, min: 0 },
    outstandingBalanceBefore: { type: Number, required: true, min: 0 },
    outstandingBalanceAfter: { type: Number, required: true, min: 0 },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ["cash", "savings_deduction", "bank_transfer", "mobile_money"],
      default: "cash",
    },
    reference: { type: String, trim: true },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recorded by is required"],
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

// Auto-generate repaymentId
LoanRepaymentSchema.pre("save", async function () {
  if (!this.repaymentId) {
    const count = await mongoose.model("LoanRepayment").countDocuments();
    this.repaymentId = `RPY-${String(count + 1).padStart(5, "0")}`;
  }
});

LoanRepaymentSchema.index({ loanId: 1, paymentDate: -1 });
LoanRepaymentSchema.index({ memberId: 1, paymentDate: -1 });

export default mongoose.models.LoanRepayment ||
  mongoose.model<ILoanRepayment>("LoanRepayment", LoanRepaymentSchema);
