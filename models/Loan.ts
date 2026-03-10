import mongoose, { Schema, Document } from "mongoose";

export type LoanStatus =
  | "pending" // submitted, awaiting review
  | "under_review" // staff/admin reviewing
  | "approved" // approved, funds not yet disbursed
  | "active" // disbursed and being repaid
  | "overdue" // missed payment(s)
  | "paid" // fully repaid
  | "rejected" // application rejected
  | "cancelled"; // withdrawn by member

export type LoanPurpose =
  | "business"
  | "education"
  | "medical"
  | "housing"
  | "personal"
  | "agriculture"
  | "other";

export interface ILoan extends Document {
  loanId: string; // auto-generated e.g. LN-00001
  memberId: mongoose.Types.ObjectId; // ref: Member
  applicationDate: Date;
  loanAmount: number;
  interestRate: number; // annual % e.g. 18
  loanDurationMonths: number; // term in months
  purpose: LoanPurpose;
  purposeDescription?: string;
  monthlyRepayment: number; // calculated: (principal + interest) / months
  totalPayable: number; // loanAmount + total interest
  totalInterest: number;
  amountPaid: number;
  outstandingBalance: number; // totalPayable - amountPaid
  penaltyAmount: number; // accumulated late-payment charges
  status: LoanStatus;
  // Approval
  reviewedBy?: mongoose.Types.ObjectId; // staff who reviewed
  approvedBy?: mongoose.Types.ObjectId; // admin who approved
  reviewDate?: Date;
  approvalDate?: Date;
  rejectionReason?: string;
  // Disbursement
  disbursementDate?: Date;
  dueDate?: Date; // final repayment due date
  nextPaymentDate?: Date;
  // Eligibility snapshot (stored at application time)
  eligibilityScore: number; // 0–100
  savingsBalanceAtApplication: number;
  creditHistory: "good" | "fair" | "poor" | "no_history";
  // Metadata
  notes?: string;
  appliedBy: mongoose.Types.ObjectId; // user who created application (member/staff/admin)
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchema = new Schema<ILoan>(
  {
    loanId: {
      type: String,
      unique: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member is required"],
    },
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    loanAmount: {
      type: Number,
      required: [true, "Loan amount is required"],
      min: [100, "Minimum loan amount is GH₵100"],
    },
    interestRate: {
      type: Number,
      required: [true, "Interest rate is required"],
      min: 0,
      max: 100,
    },
    loanDurationMonths: {
      type: Number,
      required: [true, "Loan duration is required"],
      min: [1, "Minimum 1 month"],
      max: [60, "Maximum 60 months"],
    },
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
      required: [true, "Loan purpose is required"],
    },
    purposeDescription: {
      type: String,
      trim: true,
    },
    monthlyRepayment: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPayable: {
      type: Number,
      required: true,
    },
    totalInterest: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      default: function (this: ILoan) {
        return this.totalPayable;
      },
    },
    penaltyAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
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
      required: [true, "Applied by is required"],
    },
  },
  { timestamps: true },
);

// Auto-generate loanId
LoanSchema.pre("save", async function () {
  if (!this.loanId) {
    const count = await mongoose.model("Loan").countDocuments();
    this.loanId = `LN-${String(count + 1).padStart(5, "0")}`;
  }
});

// Indexes for common queries
LoanSchema.index({ memberId: 1, status: 1 });
LoanSchema.index({ status: 1, applicationDate: -1 });
LoanSchema.index({ nextPaymentDate: 1, status: 1 });

export default mongoose.models.Loan ||
  mongoose.model<ILoan>("Loan", LoanSchema);
