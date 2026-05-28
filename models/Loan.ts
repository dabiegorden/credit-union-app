import mongoose, { Schema, Document } from "mongoose";

export type LoanStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "active"
  | "overdue"
  | "paid"
  | "rejected"
  | "cancelled";

export type LoanPurpose =
  | "business"
  | "education"
  | "medical"
  | "housing"
  | "personal"
  | "agriculture"
  | "other";

export interface ILoan extends Document {
  loanId: string;
  clientId: mongoose.Types.ObjectId;
  applicationDate: Date;
  loanAmount: number;
  // Interest rate management
  baseInterestRate: number; // system base rate (annual %)
  amountSurcharge: number; // small rate added based on loan size
  finalInterestRate: number; // base + surcharge + any manual override
  interestRateSetBy?: mongoose.Types.ObjectId; // staff/admin who last adjusted
  loanDurationMonths: number;
  purpose: LoanPurpose;
  purposeDescription?: string;
  monthlyRepayment: number;
  totalPayable: number;
  totalInterest: number;
  amountPaid: number;
  outstandingBalance: number;
  penaltyAmount: number;
  status: LoanStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  reviewDate?: Date;
  approvalDate?: Date;
  rejectionReason?: string;
  disbursementDate?: Date;
  dueDate?: Date;
  nextPaymentDate?: Date;
  eligibilityScore: number;
  savingsBalanceAtApplication: number;
  creditHistory: "good" | "fair" | "poor" | "no_history";
  notes?: string;
  appliedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchema = new Schema<ILoan>(
  {
    loanId: { type: String, unique: true },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    applicationDate: { type: Date, default: Date.now },
    loanAmount: { type: Number, required: true, min: 100 },
    baseInterestRate: { type: Number, required: true, min: 0, max: 100 },
    amountSurcharge: { type: Number, default: 0, min: 0 },
    finalInterestRate: { type: Number, required: true, min: 0, max: 100 },
    interestRateSetBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    loanDurationMonths: { type: Number, required: true, min: 1, max: 60 },
    purpose: {
      type: String,
      enum: [
        "business",
        "education",
        "medical",
        "housing",
        "personal",
        "agriculture",
        "other",
      ],
      required: true,
    },
    purposeDescription: { type: String, trim: true },
    monthlyRepayment: { type: Number, required: true, min: 0 },
    totalPayable: { type: Number, required: true },
    totalInterest: { type: Number, required: true },
    amountPaid: { type: Number, default: 0, min: 0 },
    outstandingBalance: { type: Number, required: true },
    penaltyAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: [
        "pending",
        "under_review",
        "approved",
        "active",
        "overdue",
        "paid",
        "rejected",
        "cancelled",
      ],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewDate: { type: Date, default: null },
    approvalDate: { type: Date, default: null },
    rejectionReason: { type: String, trim: true },
    disbursementDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    nextPaymentDate: { type: Date, default: null },
    eligibilityScore: { type: Number, default: 0, min: 0, max: 100 },
    savingsBalanceAtApplication: { type: Number, default: 0 },
    creditHistory: {
      type: String,
      enum: ["good", "fair", "poor", "no_history"],
      default: "no_history",
    },
    notes: { type: String, trim: true },
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

LoanSchema.pre("save", async function () {
  if (!this.loanId) {
    const count = await mongoose.model("Loan").countDocuments();
    this.loanId = `LN-${String(count + 1).padStart(5, "0")}`;
  }
});

LoanSchema.index({ clientId: 1, status: 1 });
LoanSchema.index({ status: 1, applicationDate: -1 });
LoanSchema.index({ nextPaymentDate: 1, status: 1 });

export default mongoose.models.Loan ||
  mongoose.model<ILoan>("Loan", LoanSchema);
