/**
 * GET  /api/loans/repayments   — list repayments (paginated, filterable)
 * POST /api/loans/repayments   — record a repayment (admin | staff)
 *
 * Penalty logic:
 *   When a repayment is recorded, if the loan's nextPaymentDate is in the past,
 *   we calculate the accumulated penalty (2% per month = ~0.0667%/day on outstanding
 *   balance) and add it to the loan's penaltyAmount. The repayment is then applied
 *   in this order: penalty → interest → principal.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import LoanRepayment from "@/models/LoanRepayment";
import Member from "@/models/Member";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { DAILY_PENALTY_RATE } from "@/models/LoanEligibility";
import { z } from "zod";

const repaymentSchema = z.object({
  loanId: z.string().min(1, "Loan ID is required"),
  amount: z.number().positive("Amount must be positive"),
  method: z
    .enum(["cash", "savings_deduction", "bank_transfer", "mobile_money"])
    .default("cash"),
  reference: z.string().trim().optional(),
  paymentDate: z.string().optional(), // ISO date — defaults to now
  notes: z.string().trim().max(500).optional(),
});

// ─── GET /api/loans/repayments ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20")),
    );
    const loanId = searchParams.get("loanId") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const query: Record<string, unknown> = {};

    if (auth.user?.role === "member") {
      const member = await Member.findOne({ userId: auth.user.userId });
      if (!member) {
        return NextResponse.json(
          { error: "Member profile not found" },
          { status: 404 },
        );
      }
      query.memberId = member._id;
    } else {
      const memberId = searchParams.get("memberId");
      if (memberId) query.memberId = memberId;
    }

    if (loanId) query.loanId = loanId;

    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(from);
      if (to) range.$lte = new Date(to + "T23:59:59Z");
      query.paymentDate = range;
    }

    const [total, repayments] = await Promise.all([
      LoanRepayment.countDocuments(query),
      LoanRepayment.find(query)
        .populate(
          "loanId",
          "loanId loanAmount status outstandingBalance interestRate loanDurationMonths",
        )
        .populate("memberId", "memberId firstName lastName email")
        .populate("recordedBy", "name email role")
        .sort({ paymentDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      repayments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/loans/repayments]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── POST /api/loans/repayments ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Only admin and staff can record repayments
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const body = await request.json();
    const parsed = repaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { loanId, amount, method, reference, paymentDate, notes } =
      parsed.data;

    /* ── Fetch loan ── */
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    if (!["active", "overdue"].includes(loan.status)) {
      return NextResponse.json(
        { error: `Cannot record repayment — loan status is "${loan.status}"` },
        { status: 409 },
      );
    }

    const paidOn = paymentDate ? new Date(paymentDate) : new Date();

    /* ── Penalty calculation ── */
    let newPenalty = 0;
    if (
      loan.nextPaymentDate &&
      paidOn > new Date(loan.nextPaymentDate) &&
      loan.outstandingBalance > 0
    ) {
      const daysLate = Math.max(
        0,
        Math.floor(
          (paidOn.getTime() - new Date(loan.nextPaymentDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      if (daysLate > 0) {
        newPenalty =
          Math.round(
            loan.outstandingBalance * DAILY_PENALTY_RATE * daysLate * 100,
          ) / 100;
        loan.penaltyAmount =
          Math.round((loan.penaltyAmount + newPenalty) * 100) / 100;
        loan.status = "overdue";
      }
    }

    /* ── Apply payment — penalty first, then outstanding balance ── */
    const totalOwed = loan.outstandingBalance + loan.penaltyAmount;
    if (amount > totalOwed + 0.01) {
      return NextResponse.json(
        {
          error: `Payment of GH₵${amount.toFixed(2)} exceeds total owed of GH₵${totalOwed.toFixed(2)} (outstanding: GH₵${loan.outstandingBalance.toFixed(2)} + penalty: GH₵${loan.penaltyAmount.toFixed(2)})`,
        },
        { status: 400 },
      );
    }

    let remaining = amount;

    // 1. Clear penalty first
    const penaltyCleared = Math.min(remaining, loan.penaltyAmount);
    loan.penaltyAmount =
      Math.round((loan.penaltyAmount - penaltyCleared) * 100) / 100;
    remaining = Math.round((remaining - penaltyCleared) * 100) / 100;

    // 2. Apply remainder to outstanding balance
    const balanceBefore = loan.outstandingBalance;
    const principalAndInterest = remaining;
    loan.amountPaid = Math.round((loan.amountPaid + remaining) * 100) / 100;
    loan.outstandingBalance =
      Math.round(Math.max(0, loan.outstandingBalance - remaining) * 100) / 100;

    // Portions for record (proportional split between principal & interest in flat-rate model)
    const interestFraction = loan.totalInterest / loan.totalPayable;
    const interestPortion =
      Math.round(principalAndInterest * interestFraction * 100) / 100;
    const principalPortion =
      Math.round((principalAndInterest - interestPortion) * 100) / 100;

    /* ── Update loan status ── */
    if (loan.outstandingBalance <= 0.01) {
      loan.status = "paid";
      loan.outstandingBalance = 0;
      loan.nextPaymentDate = undefined;
    } else {
      // Advance nextPaymentDate by one month
      const nextDate = loan.nextPaymentDate
        ? new Date(loan.nextPaymentDate)
        : new Date(paidOn);
      nextDate.setMonth(nextDate.getMonth() + 1);
      loan.nextPaymentDate = nextDate;
      loan.status = "active";
    }

    await loan.save();

    /* ── Persist repayment record ── */
    const repayment = new LoanRepayment({
      loanId: loan._id,
      memberId: loan.memberId,
      amount,
      principalPortion,
      interestPortion,
      penaltyPortion: penaltyCleared,
      outstandingBalanceBefore: balanceBefore,
      outstandingBalanceAfter: loan.outstandingBalance,
      paymentDate: paidOn,
      method,
      reference,
      recordedBy: auth.user!.userId,
      notes,
    });

    await repayment.save();
    await repayment.populate("recordedBy", "name email role");

    return NextResponse.json(
      {
        success: true,
        message:
          loan.status === "paid"
            ? "Loan fully repaid! 🎉"
            : `Repayment recorded. Outstanding: GH₵${loan.outstandingBalance.toFixed(2)}`,
        repayment,
        loan: {
          _id: loan._id,
          loanId: loan.loanId,
          status: loan.status,
          outstandingBalance: loan.outstandingBalance,
          penaltyAmount: loan.penaltyAmount,
          amountPaid: loan.amountPaid,
          nextPaymentDate: loan.nextPaymentDate,
        },
        breakdown: {
          penaltyCleared,
          principalPortion,
          interestPortion,
          newPenaltyAdded: newPenalty,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("[POST /api/loans/repayments]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
