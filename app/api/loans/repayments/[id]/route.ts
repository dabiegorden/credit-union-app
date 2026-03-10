/**
 * GET    /api/loans/repayments/[id]   — single repayment detail
 * PUT    /api/loans/repayments/[id]   — edit notes / reference / date (admin only)
 * DELETE /api/loans/repayments/[id]   — reverse repayment (admin only)
 *
 * Reversing a repayment:
 *   - Adds the amount back to loan.outstandingBalance
 *   - Subtracts from loan.amountPaid
 *   - If penalty was cleared, restores loan.penaltyAmount
 *   - If loan was "paid", reverts to "active"
 *   - Rolls back nextPaymentDate by one month
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import LoanRepayment from "@/models/LoanRepayment";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { z } from "zod";

const editSchema = z.object({
  notes: z.string().trim().max(500).optional(),
  reference: z.string().trim().optional(),
  paymentDate: z.string().optional(),
});

// ─── GET /api/loans/repayments/[id] ─────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();
    const { id } = await params;

    const repayment = await LoanRepayment.findById(id)
      .populate(
        "loanId",
        "loanId loanAmount totalPayable outstandingBalance status interestRate loanDurationMonths",
      )
      .populate("memberId", "memberId firstName lastName email phone")
      .populate("recordedBy", "name email role")
      .lean();

    if (!repayment) {
      return NextResponse.json(
        { error: "Repayment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, repayment });
  } catch (err: unknown) {
    console.error("[GET /api/loans/repayments/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PUT /api/loans/repayments/[id] ─────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();
    const { id } = await params;

    const body = await request.json();
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const repayment = await LoanRepayment.findById(id);
    if (!repayment) {
      return NextResponse.json(
        { error: "Repayment not found" },
        { status: 404 },
      );
    }

    if (parsed.data.notes !== undefined) repayment.notes = parsed.data.notes;
    if (parsed.data.reference !== undefined)
      repayment.reference = parsed.data.reference;
    if (parsed.data.paymentDate !== undefined)
      repayment.paymentDate = new Date(parsed.data.paymentDate);

    await repayment.save();
    await repayment.populate("recordedBy", "name email role");

    return NextResponse.json({
      success: true,
      message: "Repayment updated",
      repayment,
    });
  } catch (err: unknown) {
    console.error("[PUT /api/loans/repayments/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/loans/repayments/[id] — REVERSE ────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();
    const { id } = await params;

    const repayment = await LoanRepayment.findById(id);
    if (!repayment) {
      return NextResponse.json(
        { error: "Repayment not found" },
        { status: 404 },
      );
    }

    const loan = await Loan.findById(repayment.loanId);
    if (!loan) {
      return NextResponse.json(
        { error: "Associated loan not found" },
        { status: 404 },
      );
    }

    /* Safety: only allow reversing the most recent repayment to avoid balance corruption */
    const latestRepayment = await LoanRepayment.findOne({ loanId: loan._id })
      .sort({ createdAt: -1 })
      .lean();

    if (
      !latestRepayment ||
      String(latestRepayment._id) !== String(repayment._id)
    ) {
      return NextResponse.json(
        {
          error:
            "Only the most recent repayment can be reversed to maintain balance integrity",
        },
        { status: 409 },
      );
    }

    /* ── Reverse the repayment ── */

    // Restore outstanding balance
    loan.outstandingBalance =
      Math.round((loan.outstandingBalance + repayment.amount) * 100) / 100;

    // Restore amount paid (principal + interest portions only, not penalty)
    const paidPortion = repayment.principalPortion + repayment.interestPortion;
    loan.amountPaid =
      Math.round(Math.max(0, loan.amountPaid - paidPortion) * 100) / 100;

    // Restore penalty if any was cleared
    if (repayment.penaltyPortion > 0) {
      loan.penaltyAmount =
        Math.round((loan.penaltyAmount + repayment.penaltyPortion) * 100) / 100;
    }

    // Revert loan status if it was marked paid
    if (loan.status === "paid") {
      loan.status = "active";
      // Roll back nextPaymentDate by 1 month
      const prev = new Date(repayment.paymentDate);
      // nextPaymentDate should be the date the reversed payment was FOR
      loan.nextPaymentDate = new Date(repayment.paymentDate);
    }

    await loan.save();
    await repayment.deleteOne();

    return NextResponse.json({
      success: true,
      message: "Repayment reversed successfully. Loan balance restored.",
      loan: {
        _id: loan._id,
        loanId: loan.loanId,
        status: loan.status,
        outstandingBalance: loan.outstandingBalance,
        penaltyAmount: loan.penaltyAmount,
        amountPaid: loan.amountPaid,
        nextPaymentDate: loan.nextPaymentDate,
      },
    });
  } catch (err: unknown) {
    console.error("[DELETE /api/loans/repayments/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
