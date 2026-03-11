/**
 * POST /api/member/repayments
 *
 * Member-facing repayment endpoint.
 *
 * The core repayment logic lives in /api/loans/repayments (POST), but that
 * route is restricted to admin/staff. This wrapper:
 *
 *  1. Authenticates the member via JWT
 *  2. Resolves their Member record (with userId + email fallback + backfill)
 *  3. Verifies the loan actually belongs to THEM
 *  4. Applies the same penalty + repayment logic directly
 *
 * Supported payment methods:
 *   cash | savings_deduction | bank_transfer | mobile_money
 *
 * Place at: src/app/api/member/repayments/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import LoanRepayment from "@/models/LoanRepayment";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { resolveMemberForUser } from "@/app/api/member/profile/route";
import { z } from "zod";

/* If DAILY_PENALTY_RATE is not exported from LoanEligibility, define the same value inline */
const DAILY_PENALTY_RATE = 0.02 / 30; // 2% per month ≈ 0.000667/day

const repaymentSchema = z.object({
  loanId: z.string().min(1, "Loan ID is required"),
  amount: z.number().positive("Amount must be positive"),
  method: z
    .enum(["cash", "savings_deduction", "bank_transfer", "mobile_money"])
    .default("cash"),
  reference: z.string().trim().optional(),
  paymentDate: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["member"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    /* ── Resolve Member ── */
    const member = await resolveMemberForUser(auth.user!.userId);
    if (!member) {
      return NextResponse.json(
        {
          error: "Member profile not found",
          code: "MEMBER_PROFILE_NOT_FOUND",
          message:
            "Your login account is not linked to a Member profile. Please contact staff.",
        },
        { status: 404 },
      );
    }

    /* ── Parse + validate body ── */
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

    /* ── Ownership check — critical security gate ── */
    if (String(loan.memberId) !== String(member._id)) {
      return NextResponse.json(
        { error: "You are not authorized to repay this loan" },
        { status: 403 },
      );
    }

    /* ── Status check ── */
    if (!["active", "overdue"].includes(loan.status)) {
      return NextResponse.json(
        { error: `Cannot record repayment — loan status is "${loan.status}"` },
        { status: 409 },
      );
    }

    const paidOn = paymentDate ? new Date(paymentDate) : new Date();

    /* ── Penalty calculation (same logic as staff route) ── */
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

    /* ── Overpayment guard ── */
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

    /* ── 1. Clear penalty first ── */
    const penaltyCleared = Math.min(remaining, loan.penaltyAmount);
    loan.penaltyAmount =
      Math.round((loan.penaltyAmount - penaltyCleared) * 100) / 100;
    remaining = Math.round((remaining - penaltyCleared) * 100) / 100;

    /* ── 2. Apply remainder to outstanding balance ── */
    const balanceBefore = loan.outstandingBalance;
    const principalAndInterest = remaining;

    loan.amountPaid = Math.round((loan.amountPaid + remaining) * 100) / 100;
    loan.outstandingBalance =
      Math.round(Math.max(0, loan.outstandingBalance - remaining) * 100) / 100;

    /* Proportional interest/principal split (flat-rate model) */
    const interestFraction = loan.totalInterest / loan.totalPayable;
    const interestPortion =
      Math.round(principalAndInterest * interestFraction * 100) / 100;
    const principalPortion =
      Math.round((principalAndInterest - interestPortion) * 100) / 100;

    /* ── 3. Update loan status ── */
    if (loan.outstandingBalance <= 0.01) {
      loan.status = "paid";
      loan.outstandingBalance = 0;
      loan.nextPaymentDate = undefined;
    } else {
      const nextDate = loan.nextPaymentDate
        ? new Date(loan.nextPaymentDate)
        : new Date(paidOn);
      nextDate.setMonth(nextDate.getMonth() + 1);
      loan.nextPaymentDate = nextDate;
      loan.status = "active";
    }

    await loan.save();

    /* ── 4. Persist repayment record ── */
    const repayment = new LoanRepayment({
      loanId: loan._id,
      memberId: member._id,
      amount,
      principalPortion,
      interestPortion,
      penaltyPortion: penaltyCleared,
      outstandingBalanceBefore: balanceBefore,
      outstandingBalanceAfter: loan.outstandingBalance,
      paymentDate: paidOn,
      method,
      reference,
      recordedBy: auth.user!.userId, // self-recorded
      notes,
    });

    await repayment.save();

    return NextResponse.json(
      {
        success: true,
        message:
          loan.status === "paid"
            ? "Congratulations! Your loan is fully repaid! 🎉"
            : `Repayment recorded. Outstanding balance: GH₵${loan.outstandingBalance.toFixed(2)}`,
        repayment: {
          _id: repayment._id,
          amount: repayment.amount,
          paymentDate: repayment.paymentDate,
          method: repayment.method,
        },
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
  } catch (err) {
    console.error("[POST /api/member/repayments]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/member/repayments
 * Member's own repayment history — wraps /api/loans/repayments with member scoping.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["member"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const member = await resolveMemberForUser(auth.user!.userId);
    if (!member) {
      return NextResponse.json(
        { error: "Member profile not found", code: "MEMBER_PROFILE_NOT_FOUND" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20")),
    );
    const loanId = searchParams.get("loanId") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const method = searchParams.get("method") || "";

    const query: Record<string, unknown> = { memberId: member._id };
    if (loanId) query.loanId = loanId;
    if (method) query.method = method;
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
        .sort({ paymentDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      repayments,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[GET /api/member/repayments]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
