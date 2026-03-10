/**
 * GET /api/reports/loans
 *
 * Returns aggregated loan data for charts + tabular export.
 * Admin and Staff only.
 *
 * Query params:
 *   from      — ISO date string  (default: 90 days ago)
 *   to        — ISO date string  (default: today)
 *   groupBy   — "day" | "week" | "month" (default: "month")
 *   status    — filter by loan status
 *   purpose   — filter by loan purpose
 *   memberId  — filter by specific member
 *   export    — "1" → flat rows for Excel
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import LoanRepayment from "@/models/LoanRepayment";
import { authMiddleware } from "@/middleware/Authmiddleware";

// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const { searchParams } = new URL(request.url);

    const toDate = searchParams.get("to")
      ? new Date(searchParams.get("to")! + "T23:59:59Z")
      : new Date();
    const fromDate = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : new Date(toDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const groupBy = (searchParams.get("groupBy") || "month") as
      | "day"
      | "week"
      | "month";
    const statusFilt = searchParams.get("status") || "";
    const purposeFilt = searchParams.get("purpose") || "";
    const memberIdStr = searchParams.get("memberId") || "";
    const isExport = searchParams.get("export") === "1";

    /* ── Base match for loan applications ── */
    const loanMatch: Record<string, unknown> = {
      applicationDate: { $gte: fromDate, $lte: toDate },
    };
    if (statusFilt) loanMatch.status = statusFilt;
    if (purposeFilt) loanMatch.purpose = purposeFilt;
    if (memberIdStr) {
      const mongoose = (await import("mongoose")).default;
      loanMatch.memberId = new mongoose.Types.ObjectId(memberIdStr);
    }

    /* ── Export mode ── */
    if (isExport) {
      const loans = await Loan.find(loanMatch)
        .populate("memberId", "memberId firstName lastName email phone")
        .populate("appliedBy", "name role")
        .populate("approvedBy", "name role")
        .sort({ applicationDate: -1 })
        .limit(10000)
        .lean();

      const flat = loans.map((l) => {
        const m = l.memberId as unknown as {
          memberId: string;
          firstName: string;
          lastName: string;
          email: string;
          phone: string;
        } | null;
        const a = l.appliedBy as unknown as {
          name: string;
          role: string;
        } | null;
        const ap = l.approvedBy as unknown as {
          name: string;
          role: string;
        } | null;
        return {
          "Loan ID": l.loanId,
          "Application Date": l.applicationDate
            ? new Date(l.applicationDate).toISOString().split("T")[0]
            : "",
          "Member ID": m?.memberId ?? "",
          "Member Name": m ? `${m.firstName} ${m.lastName}` : "",
          "Member Email": m?.email ?? "",
          "Member Phone": m?.phone ?? "",
          Status: l.status,
          Purpose: l.purpose,
          "Loan Amount": l.loanAmount,
          "Interest Rate (%)": l.interestRate,
          "Duration (months)": l.loanDurationMonths,
          "Monthly Repayment": l.monthlyRepayment,
          "Total Interest": l.totalInterest,
          "Total Payable": l.totalPayable,
          "Amount Paid": l.amountPaid,
          "Outstanding Balance": l.outstandingBalance,
          "Penalty Amount": l.penaltyAmount,
          "Eligibility Score": l.eligibilityScore,
          "Credit History": l.creditHistory,
          "Applied By": a?.name ?? "",
          "Applied By Role": a?.role ?? "",
          "Approved By": ap?.name ?? "",
          "Approval Date": l.approvalDate
            ? new Date(l.approvalDate).toISOString().split("T")[0]
            : "",
          "Disburse Date": l.disbursementDate
            ? new Date(l.disbursementDate).toISOString().split("T")[0]
            : "",
          "Due Date": l.dueDate
            ? new Date(l.dueDate).toISOString().split("T")[0]
            : "",
          "Next Payment": l.nextPaymentDate
            ? new Date(l.nextPaymentDate).toISOString().split("T")[0]
            : "",
          "Rejection Reason": l.rejectionReason ?? "",
          Notes: l.notes ?? "",
        };
      });

      return NextResponse.json({
        success: true,
        rows: flat,
        count: flat.length,
      });
    }

    /* ── Aggregate mode ── */

    const dateFormat: Record<string, string> = {
      day: "%Y-%m-%d",
      week: "%Y-%U",
      month: "%Y-%m",
    };

    /* 1. Applications over time */
    const applicationsOverTime = await Loan.aggregate([
      { $match: loanMatch },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat[groupBy],
              date: "$applicationDate",
            },
          },
          count: { $sum: 1 },
          amount: { $sum: "$loanAmount" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { period: "$_id", count: 1, amount: 1, _id: 0 } },
    ]);

    /* 2. Status distribution */
    const statusDistribution = await Loan.aggregate([
      { $match: loanMatch },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amount: { $sum: "$loanAmount" },
        },
      },
    ]);

    /* 3. Purpose breakdown */
    const purposeBreakdown = await Loan.aggregate([
      { $match: loanMatch },
      {
        $group: {
          _id: "$purpose",
          count: { $sum: 1 },
          amount: { $sum: "$loanAmount" },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    /* 4. Repayment performance over time (all repayments in range) */
    const repayMatch: Record<string, unknown> = {
      paymentDate: { $gte: fromDate, $lte: toDate },
    };
    const repaymentOverTime = await LoanRepayment.aggregate([
      { $match: repayMatch },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat[groupBy],
              date: "$paymentDate",
            },
          },
          totalPaid: { $sum: "$amount" },
          count: { $sum: 1 },
          principal: { $sum: "$principalPortion" },
          interest: { $sum: "$interestPortion" },
          penalty: { $sum: "$penaltyPortion" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          period: "$_id",
          totalPaid: 1,
          count: 1,
          principal: 1,
          interest: 1,
          penalty: 1,
          _id: 0,
        },
      },
    ]);

    /* 5. KPIs */
    const loanKpis = await Loan.aggregate([
      { $match: loanMatch },
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
          totalAmountApplied: { $sum: "$loanAmount" },
          totalAmountDisbursed: {
            $sum: {
              $cond: [
                { $in: ["$status", ["active", "overdue", "paid"]] },
                "$loanAmount",
                0,
              ],
            },
          },
          totalOutstanding: { $sum: "$outstandingBalance" },
          totalPaid: { $sum: "$amountPaid" },
          totalPenalties: { $sum: "$penaltyAmount" },
          avgLoanAmount: { $avg: "$loanAmount" },
          avgInterestRate: { $avg: "$interestRate" },
          avgDuration: { $avg: "$loanDurationMonths" },
          avgEligibilityScore: { $avg: "$eligibilityScore" },
          activeCount: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          overdueCount: {
            $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] },
          },
          paidCount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
          pendingCount: {
            $sum: {
              $cond: [{ $in: ["$status", ["pending", "under_review"]] }, 1, 0],
            },
          },
        },
      },
    ]);

    const kpis = loanKpis[0] ?? {
      totalApplications: 0,
      totalAmountApplied: 0,
      totalAmountDisbursed: 0,
      totalOutstanding: 0,
      totalPaid: 0,
      totalPenalties: 0,
      avgLoanAmount: 0,
      avgInterestRate: 0,
      avgDuration: 0,
      avgEligibilityScore: 0,
      activeCount: 0,
      overdueCount: 0,
      paidCount: 0,
      rejectedCount: 0,
      pendingCount: 0,
    };

    /* 6. Repayment KPIs (in date range) */
    const repayKpis = await LoanRepayment.aggregate([
      { $match: repayMatch },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$amount" },
          totalPrincipal: { $sum: "$principalPortion" },
          totalInterest: { $sum: "$interestPortion" },
          totalPenalty: { $sum: "$penaltyPortion" },
          repaymentCount: { $sum: 1 },
        },
      },
    ]);

    const repaymentKpis = repayKpis[0] ?? {
      totalCollected: 0,
      totalPrincipal: 0,
      totalInterest: 0,
      totalPenalty: 0,
      repaymentCount: 0,
    };

    /* 7. Credit history breakdown */
    const creditHistoryBreakdown = await Loan.aggregate([
      { $match: loanMatch },
      {
        $group: {
          _id: "$creditHistory",
          count: { $sum: 1 },
          amount: { $sum: "$loanAmount" },
        },
      },
    ]);

    /* 8. Eligibility score distribution (buckets) */
    const scoreBuckets = await Loan.aggregate([
      { $match: loanMatch },
      {
        $bucket: {
          groupBy: "$eligibilityScore",
          boundaries: [0, 20, 40, 50, 60, 70, 80, 90, 101],
          default: "Other",
          output: { count: { $sum: 1 }, avgAmount: { $avg: "$loanAmount" } },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      period: { from: fromDate, to: toDate, groupBy },
      kpis,
      repaymentKpis,
      applicationsOverTime,
      statusDistribution,
      purposeBreakdown,
      repaymentOverTime,
      creditHistoryBreakdown,
      scoreBuckets,
    });
  } catch (err: unknown) {
    console.error("[GET /api/reports/loans]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
