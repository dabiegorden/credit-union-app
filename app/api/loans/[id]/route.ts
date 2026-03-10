/**
 * GET    /api/loans/[id]   — single loan + repayment history
 * PUT    /api/loans/[id]   — update status: review | approve | reject | disburse | cancel
 * DELETE /api/loans/[id]   — hard delete (admin only, pending/rejected loans only)
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import LoanRepayment from "@/models/LoanRepayment";
import Member from "@/models/Member";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { z } from "zod";

/* ── Action schemas ── */
const reviewSchema = z.object({
  action: z.literal("review"),
  notes: z.string().trim().optional(),
});

const approveSchema = z.object({
  action: z.literal("approve"),
  disbursementDate: z.string().optional(), // ISO date — defaults to today
  notes: z.string().trim().optional(),
  interestRateOverride: z.number().min(0).max(100).optional(),
});

const rejectSchema = z.object({
  action: z.literal("reject"),
  rejectionReason: z
    .string()
    .trim()
    .min(5, "Please provide a rejection reason"),
});

const disburseSchema = z.object({
  action: z.literal("disburse"),
  disbursementDate: z.string().optional(),
  notes: z.string().trim().optional(),
});

const cancelSchema = z.object({
  action: z.literal("cancel"),
  notes: z.string().trim().optional(),
});

const updateSchema = z.union([
  reviewSchema,
  approveSchema,
  rejectSchema,
  disburseSchema,
  cancelSchema,
]);

// ─── GET /api/loans/[id] ─────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();
    const { id } = await params;

    const loan = await Loan.findById(id)
      .populate(
        "memberId",
        "memberId firstName lastName email phone savingsBalance status dateJoined",
      )
      .populate("appliedBy", "name email role")
      .populate("reviewedBy", "name email role")
      .populate("approvedBy", "name email role")
      .lean();

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    /* Member can only view their own loans */
    if (auth.user?.role === "member") {
      const member = await Member.findOne({ userId: auth.user.userId });
      if (!member || String(loan.memberId._id) !== String(member._id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    /* Fetch repayment history */
    const repayments = await LoanRepayment.find({ loanId: id })
      .populate("recordedBy", "name email role")
      .sort({ paymentDate: -1 })
      .lean();

    /* Compute overdue penalty preview (does NOT persist) */
    let pendingPenalty = 0;
    if (
      loan.status === "active" &&
      loan.nextPaymentDate &&
      new Date(loan.nextPaymentDate) < new Date()
    ) {
      const daysLate = Math.floor(
        (Date.now() - new Date(loan.nextPaymentDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      pendingPenalty =
        Math.round(((loan.outstandingBalance * 0.02) / 30) * daysLate * 100) /
        100;
    }

    return NextResponse.json({
      success: true,
      loan,
      repayments,
      pendingPenalty,
      repaymentSummary: {
        totalRepayments: repayments.length,
        totalPaid: repayments.reduce((s, r) => s + r.amount, 0),
        outstanding: loan.outstandingBalance,
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/loans/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PUT /api/loans/[id] ─────────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();
    const { id } = await params;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const loan = await Loan.findById(id);
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    const { action } = parsed.data;

    /* ── Permission gates ── */
    if (action === "review" && !["admin", "staff"].includes(auth.user?.role!)) {
      return NextResponse.json(
        { error: "Only staff or admin can review loans" },
        { status: 403 },
      );
    }
    if (action === "approve" && auth.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can approve loans" },
        { status: 403 },
      );
    }
    if (action === "reject" && auth.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can reject loans" },
        { status: 403 },
      );
    }
    if (action === "disburse" && auth.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can disburse loans" },
        { status: 403 },
      );
    }
    if (action === "cancel") {
      /* Members can cancel their own pending apps; admin/staff can cancel anything */
      if (auth.user?.role === "member") {
        const member = await Member.findOne({ userId: auth.user.userId });
        if (!member || String(loan.memberId) !== String(member._id)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    /* ── State-machine transitions ── */
    switch (action) {
      /* ── REVIEW: pending → under_review ── */
      case "review": {
        if (loan.status !== "pending") {
          return NextResponse.json(
            {
              error: `Cannot mark as under_review — loan is already ${loan.status}`,
            },
            { status: 409 },
          );
        }
        loan.status = "under_review";
        loan.reviewedBy = auth.user!
          .userId as unknown as typeof loan.reviewedBy;
        loan.reviewDate = new Date();
        if (parsed.data.notes) loan.notes = parsed.data.notes;
        break;
      }

      /* ── APPROVE: pending|under_review → approved ── */
      case "approve": {
        if (!["pending", "under_review"].includes(loan.status)) {
          return NextResponse.json(
            { error: `Cannot approve — loan is ${loan.status}` },
            { status: 409 },
          );
        }
        const approveData = parsed.data as z.infer<typeof approveSchema>;

        /* Optionally override interest rate and recalculate */
        if (
          approveData.interestRateOverride !== undefined &&
          approveData.interestRateOverride !== loan.interestRate
        ) {
          const r = approveData.interestRateOverride;
          const totalInterest =
            loan.loanAmount * (r / 100) * (loan.loanDurationMonths / 12);
          const totalPayable = loan.loanAmount + totalInterest;
          const monthlyRepayment = totalPayable / loan.loanDurationMonths;
          loan.interestRate = r;
          loan.totalInterest = Math.round(totalInterest * 100) / 100;
          loan.totalPayable = Math.round(totalPayable * 100) / 100;
          loan.monthlyRepayment = Math.round(monthlyRepayment * 100) / 100;
          loan.outstandingBalance = loan.totalPayable;
        }

        loan.status = "approved";
        loan.approvedBy = auth.user!
          .userId as unknown as typeof loan.approvedBy;
        loan.approvalDate = new Date();
        if (!loan.reviewedBy) {
          loan.reviewedBy = auth.user!
            .userId as unknown as typeof loan.reviewedBy;
          loan.reviewDate = new Date();
        }
        if (approveData.notes) loan.notes = approveData.notes;
        break;
      }

      /* ── REJECT: pending|under_review → rejected ── */
      case "reject": {
        if (!["pending", "under_review"].includes(loan.status)) {
          return NextResponse.json(
            { error: `Cannot reject — loan is ${loan.status}` },
            { status: 409 },
          );
        }
        const rejectData = parsed.data as z.infer<typeof rejectSchema>;
        loan.status = "rejected";
        loan.rejectionReason = rejectData.rejectionReason;
        loan.reviewedBy = auth.user!
          .userId as unknown as typeof loan.reviewedBy;
        loan.reviewDate = new Date();
        break;
      }

      /* ── DISBURSE: approved → active ── */
      case "disburse": {
        if (loan.status !== "approved") {
          return NextResponse.json(
            {
              error: `Cannot disburse — loan must be approved first (current: ${loan.status})`,
            },
            { status: 409 },
          );
        }
        const disburseData = parsed.data as z.infer<typeof disburseSchema>;
        const disbursedOn = disburseData.disbursementDate
          ? new Date(disburseData.disbursementDate)
          : new Date();

        // First payment due 1 month after disbursement
        const nextPayment = new Date(disbursedOn);
        nextPayment.setMonth(nextPayment.getMonth() + 1);

        // Final due date = disbursement + duration months
        const dueDate = new Date(disbursedOn);
        dueDate.setMonth(dueDate.getMonth() + loan.loanDurationMonths);

        loan.status = "active";
        loan.disbursementDate = disbursedOn;
        loan.nextPaymentDate = nextPayment;
        loan.dueDate = dueDate;
        if (disburseData.notes) loan.notes = disburseData.notes;
        break;
      }

      /* ── CANCEL: pending|under_review → cancelled ── */
      case "cancel": {
        if (!["pending", "under_review", "approved"].includes(loan.status)) {
          return NextResponse.json(
            { error: `Cannot cancel — loan is ${loan.status}` },
            { status: 409 },
          );
        }
        loan.status = "cancelled";
        if (parsed.data.notes) loan.notes = parsed.data.notes;
        break;
      }
    }

    await loan.save();

    await loan.populate([
      { path: "memberId", select: "memberId firstName lastName email" },
      { path: "appliedBy", select: "name email role" },
      { path: "reviewedBy", select: "name email role" },
      { path: "approvedBy", select: "name email role" },
    ]);

    const actionMessages: Record<string, string> = {
      review: "Loan moved to under review",
      approve: "Loan approved successfully",
      reject: "Loan rejected",
      disburse: "Loan disbursed — now active",
      cancel: "Loan application cancelled",
    };

    return NextResponse.json({
      success: true,
      message: actionMessages[action],
      loan,
    });
  } catch (err: unknown) {
    console.error("[PUT /api/loans/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/loans/[id] ──────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();
    const { id } = await params;

    const loan = await Loan.findById(id);
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    /* Only allow deleting pending or rejected loans */
    if (!["pending", "rejected", "cancelled"].includes(loan.status)) {
      return NextResponse.json(
        { error: "Only pending, rejected or cancelled loans can be deleted" },
        { status: 409 },
      );
    }

    const hasRepayments = await LoanRepayment.countDocuments({ loanId: id });
    if (hasRepayments > 0) {
      return NextResponse.json(
        { error: "Cannot delete — loan has repayment records" },
        { status: 409 },
      );
    }

    await loan.deleteOne();
    return NextResponse.json({ success: true, message: "Loan deleted" });
  } catch (err: unknown) {
    console.error("[DELETE /api/loans/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
