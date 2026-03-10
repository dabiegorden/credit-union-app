/**
 * GET /api/loans/eligibility?memberId=<id>
 *
 * Returns the eligibility score + breakdown for a member.
 * Admin / Staff: pass any memberId as query param
 * Member: always evaluates their own profile (memberId param ignored)
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import SavingsAccount from "@/models/Savingsaccount";
import SavingsTransaction from "@/models/Savingstransaction";
import Loan from "@/models/Loan";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { calculateEligibility } from "@/models/LoanEligibility";

export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const requestedAmount = parseFloat(searchParams.get("amount") || "0");

    let member;

    if (auth.user?.role === "member") {
      // Member can only check their own eligibility
      member = await Member.findOne({ userId: auth.user.userId });
    } else {
      // Staff / Admin — must pass memberId
      const memberId = searchParams.get("memberId");
      if (!memberId) {
        return NextResponse.json(
          { error: "memberId is required" },
          { status: 400 },
        );
      }
      member = await Member.findById(memberId);
    }

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (member.status !== "active") {
      return NextResponse.json(
        { error: "Member account is not active", eligible: false },
        { status: 400 },
      );
    }

    /* ── Gather data for scoring ── */

    // Active savings accounts
    const savingsAccounts = await SavingsAccount.find({
      memberId: member._id,
      status: "active",
    }).lean();
    const activeAccountCount = savingsAccounts.length;
    const savingsBalance = member.savingsBalance || 0;

    // Transaction activity in last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [deposits6m, depositCount6m] = await Promise.all([
      SavingsTransaction.aggregate([
        {
          $match: {
            memberId: member._id,
            transactionType: "deposit",
            date: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]),
      SavingsTransaction.countDocuments({
        memberId: member._id,
        transactionType: "deposit",
        date: { $gte: sixMonthsAgo },
      }),
    ]);

    const totalDeposits6Months = deposits6m[0]?.total || 0;
    const depositCount6Months = depositCount6m || 0;

    // Loan history
    const [completedLoans, defaultedLoans, activeLoans, pendingLoans] =
      await Promise.all([
        Loan.countDocuments({ memberId: member._id, status: "paid" }),
        Loan.countDocuments({
          memberId: member._id,
          status: { $in: ["overdue"] },
        }),
        Loan.countDocuments({
          memberId: member._id,
          status: { $in: ["active", "approved"] },
        }),
        Loan.countDocuments({
          memberId: member._id,
          status: { $in: ["pending", "under_review"] },
        }),
      ]);

    /* ── Run eligibility engine ── */
    const result = calculateEligibility({
      memberJoinDate: member.dateJoined || member.createdAt,
      savingsBalance,
      activeAccountCount,
      requestedAmount: requestedAmount || savingsBalance, // if no amount given, use balance as baseline
      totalDeposits6Months,
      depositCount6Months,
      completedLoans,
      defaultedLoans,
      activeLoans,
      pendingLoans,
    });

    return NextResponse.json({
      success: true,
      member: {
        _id: member._id,
        memberId: member.memberId,
        firstName: member.firstName,
        lastName: member.lastName,
        savingsBalance,
        activeAccountCount,
      },
      eligibility: {
        ...result,
        loanHistory: {
          completedLoans,
          defaultedLoans,
          activeLoans,
          pendingLoans,
        },
        activitySummary: {
          totalDeposits6Months,
          depositCount6Months,
        },
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/loans/eligibility]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
