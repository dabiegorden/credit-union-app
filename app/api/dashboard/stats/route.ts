/**
 * GET /api/dashboard/stats
 *
 * Returns all KPIs and sparkline data needed for the Admin Dashboard main page.
 * Admin and Staff only.
 *
 * Returns:
 *  - members:      total, active, inactive, suspended, newThisMonth
 *  - savings:      totalAccounts, active, dormant, closed, totalBalance, depositsToday, withdrawalsToday
 *  - loans:        total, pending, underReview, approved, active, overdue, paid, rejected, totalDisbursed, totalOutstanding, totalPenalties
 *  - repayments:   collectedThisMonth, countThisMonth
 *  - transactions: volumeToday, countToday, volumeThisMonth, countThisMonth
 *  - sparklines:   last-30-day daily deposit/withdrawal volumes (for mini charts)
 *  - recentLoans:  last 5 loan applications (for activity feed)
 *  - recentTx:     last 5 transactions (for activity feed)
 *  - alerts:       overdue loans, dormant accounts, low-activity members
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import SavingsAccount from "@/models/Savingsaccount";
import SavingsTransaction from "@/models/Savingstransaction";
import Loan from "@/models/Loan";
import LoanRepayment from "@/models/LoanRepayment";
import { authMiddleware } from "@/middleware/Authmiddleware";

export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    /* ── Date helpers ── */
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    /* ══════════════════════════════════════════════════
       Run all aggregations concurrently
    ══════════════════════════════════════════════════ */
    const [
      // Members
      totalMembers,
      activeMembers,
      inactiveMembers,
      suspendedMembers,
      newMembersThisMonth,
      newMembersPrevMonth,

      // Savings accounts
      totalAccounts,
      activeAccounts,
      dormantAccounts,
      closedAccounts,
      balanceAgg,

      // Savings transactions — today
      txTodayAgg,

      // Savings transactions — this month
      txMonthAgg,

      // Savings transactions — prev month (for % change)
      txPrevMonthAgg,

      // Loans — status counts + amounts
      loanStatsAgg,

      // Loan repayments — this month
      repayMonthAgg,

      // Loan repayments — prev month
      repayPrevMonthAgg,

      // Overdue loans for alerts
      overdueLoans,

      // Recent activity
      recentLoans,
      recentTx,

      // Sparkline: daily tx volumes last 30 days
      sparklineTx,

      // Sparkline: daily loan applications last 30 days
      sparklineLoans,

      // Dormant accounts (no tx in 90 days) — for alert count
      dormantAlertCount,
    ] = await Promise.all([
      /* ── Members ── */
      Member.countDocuments({}),
      Member.countDocuments({ status: "active" }),
      Member.countDocuments({ status: "inactive" }),
      Member.countDocuments({ status: "suspended" }),
      Member.countDocuments({
        dateJoined: { $gte: monthStart, $lte: monthEnd },
      }),
      Member.countDocuments({
        dateJoined: { $gte: prevMonthStart, $lte: prevMonthEnd },
      }),

      /* ── Savings accounts ── */
      SavingsAccount.countDocuments({}),
      SavingsAccount.countDocuments({ status: "active" }),
      SavingsAccount.countDocuments({ status: "dormant" }),
      SavingsAccount.countDocuments({ status: "closed" }),
      SavingsAccount.aggregate([
        { $match: { status: { $ne: "closed" } } },
        { $group: { _id: null, total: { $sum: "$balance" } } },
      ]),

      /* ── Transactions today ── */
      SavingsTransaction.aggregate([
        { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
        {
          $group: {
            _id: "$transactionType",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      /* ── Transactions this month ── */
      SavingsTransaction.aggregate([
        { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
        {
          $group: {
            _id: "$transactionType",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      /* ── Transactions prev month ── */
      SavingsTransaction.aggregate([
        { $match: { date: { $gte: prevMonthStart, $lte: prevMonthEnd } } },
        {
          $group: {
            _id: "$transactionType",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      /* ── Loan stats (all statuses) ── */
      Loan.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$loanAmount" },
            totalOutstanding: { $sum: "$outstandingBalance" },
            totalPaid: { $sum: "$amountPaid" },
            totalPenalties: { $sum: "$penaltyAmount" },
          },
        },
      ]),

      /* ── Repayments this month ── */
      LoanRepayment.aggregate([
        { $match: { paymentDate: { $gte: monthStart, $lte: monthEnd } } },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]),

      /* ── Repayments prev month ── */
      LoanRepayment.aggregate([
        {
          $match: { paymentDate: { $gte: prevMonthStart, $lte: prevMonthEnd } },
        },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]),

      /* ── Overdue loans for alert feed ── */
      Loan.find({ status: "overdue" })
        .populate("memberId", "memberId firstName lastName")
        .sort({ nextPaymentDate: 1 })
        .limit(5)
        .lean(),

      /* ── Recent loan applications ── */
      Loan.find({})
        .populate("memberId", "memberId firstName lastName")
        .populate("appliedBy", "name role")
        .sort({ applicationDate: -1 })
        .limit(6)
        .lean(),

      /* ── Recent transactions ── */
      SavingsTransaction.find({})
        .populate("memberId", "memberId firstName lastName")
        .populate("accountId", "accountNumber accountType accountName")
        .populate("recordedBy", "name role")
        .sort({ date: -1 })
        .limit(6)
        .lean(),

      /* ── Sparkline: daily tx last 30 days ── */
      SavingsTransaction.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
              type: "$transactionType",
            },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.day": 1 } },
      ]),

      /* ── Sparkline: daily loan applications last 30 days ── */
      Loan.aggregate([
        { $match: { applicationDate: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$applicationDate" },
            },
            count: { $sum: 1 },
            amount: { $sum: "$loanAmount" },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { day: "$_id", count: 1, amount: 1, _id: 0 } },
      ]),

      /* ── Dormant account alert count ── */
      (async () => {
        const ninetyDaysAgo = new Date(
          now.getTime() - 90 * 24 * 60 * 60 * 1000,
        );
        // accounts active but with no recent transaction
        const activeSavingsIds = (
          await SavingsAccount.find({ status: "active" }).select("_id").lean()
        ).map((a) => a._id);
        const recentlyActiveIds = await SavingsTransaction.distinct(
          "accountId",
          {
            date: { $gte: ninetyDaysAgo },
          },
        );
        const recentSet = new Set(recentlyActiveIds.map(String));
        return activeSavingsIds.filter((id) => !recentSet.has(String(id)))
          .length;
      })(),
    ]);

    /* ══════════════════════════════════════════════════
       Process raw aggregations into clean shapes
    ══════════════════════════════════════════════════ */

    /* Helpers */
    function pctChange(curr: number, prev: number) {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100 * 10) / 10;
    }

    /* Tx today */
    const txTodayMap: Record<string, { total: number; count: number }> = {};
    for (const r of txTodayAgg)
      txTodayMap[r._id] = { total: r.total, count: r.count };
    const depositsToday = txTodayMap.deposit?.total ?? 0;
    const withdrawalsToday = txTodayMap.withdrawal?.total ?? 0;
    const txCountToday =
      (txTodayMap.deposit?.count ?? 0) + (txTodayMap.withdrawal?.count ?? 0);

    /* Tx this month */
    const txMonthMap: Record<string, { total: number; count: number }> = {};
    for (const r of txMonthAgg)
      txMonthMap[r._id] = { total: r.total, count: r.count };
    const depositsThisMonth = txMonthMap.deposit?.total ?? 0;
    const withdrawalsThisMonth = txMonthMap.withdrawal?.total ?? 0;
    const txCountThisMonth =
      (txMonthMap.deposit?.count ?? 0) + (txMonthMap.withdrawal?.count ?? 0);

    /* Tx prev month */
    const txPrevMap: Record<string, { total: number; count: number }> = {};
    for (const r of txPrevMonthAgg)
      txPrevMap[r._id] = { total: r.total, count: r.count };

    /* Loan stats by status */
    const loanMap: Record<
      string,
      {
        count: number;
        totalAmount: number;
        totalOutstanding: number;
        totalPaid: number;
        totalPenalties: number;
      }
    > = {};
    for (const r of loanStatsAgg) loanMap[r._id] = r;

    const loanStatuses = [
      "pending",
      "under_review",
      "approved",
      "active",
      "overdue",
      "paid",
      "rejected",
      "cancelled",
    ];
    const loanCounts: Record<string, number> = {};
    const loanAmounts: Record<string, number> = {};
    let totalLoans = 0,
      totalDisbursed = 0,
      totalOutstanding = 0,
      totalLoanPaid = 0,
      totalPenalties = 0;
    for (const s of loanStatuses) {
      loanCounts[s] = loanMap[s]?.count ?? 0;
      loanAmounts[s] = loanMap[s]?.totalAmount ?? 0;
      totalLoans += loanCounts[s];
      if (["active", "overdue", "paid"].includes(s))
        totalDisbursed += loanAmounts[s];
      totalOutstanding += loanMap[s]?.totalOutstanding ?? 0;
      totalLoanPaid += loanMap[s]?.totalPaid ?? 0;
      totalPenalties += loanMap[s]?.totalPenalties ?? 0;
    }

    /* Repayments */
    const repayThisMonth = repayMonthAgg[0]?.total ?? 0;
    const repayCountMonth = repayMonthAgg[0]?.count ?? 0;
    const repayPrevMonth = repayPrevMonthAgg[0]?.total ?? 0;

    /* Sparkline tx: pivot to [{day, deposits, withdrawals}] */
    const sparkMap: Record<
      string,
      {
        day: string;
        deposits: number;
        withdrawals: number;
        depositCount: number;
        withdrawalCount: number;
      }
    > = {};
    for (const row of sparklineTx) {
      const day = row._id.day;
      if (!sparkMap[day])
        sparkMap[day] = {
          day,
          deposits: 0,
          withdrawals: 0,
          depositCount: 0,
          withdrawalCount: 0,
        };
      if (row._id.type === "deposit") {
        sparkMap[day].deposits += row.total;
        sparkMap[day].depositCount += row.count;
      }
      if (row._id.type === "withdrawal") {
        sparkMap[day].withdrawals += row.total;
        sparkMap[day].withdrawalCount += row.count;
      }
    }
    // Fill gaps in last 30 days
    const sparklineData: {
      day: string;
      deposits: number;
      withdrawals: number;
      net: number;
    }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      const entry = sparkMap[key] ?? { deposits: 0, withdrawals: 0 };
      sparklineData.push({
        day: key,
        deposits: entry.deposits,
        withdrawals: entry.withdrawals,
        net: entry.deposits - entry.withdrawals,
      });
    }

    /* Alerts */
    const alerts = {
      overdueLoansCount: loanCounts.overdue ?? 0,
      dormantAccountsCount: dormantAlertCount,
      pendingApplicationsCount:
        (loanCounts.pending ?? 0) + (loanCounts.under_review ?? 0),
      overdueLoans: overdueLoans.map((l) => {
        const m = l.memberId as unknown as {
          memberId: string;
          firstName: string;
          lastName: string;
        } | null;
        return {
          _id: l._id,
          loanId: l.loanId,
          memberName: m ? `${m.firstName} ${m.lastName}` : "Unknown",
          memberId: m?.memberId ?? "",
          outstandingBalance: l.outstandingBalance,
          penaltyAmount: l.penaltyAmount,
          nextPaymentDate: l.nextPaymentDate,
          loanAmount: l.loanAmount,
        };
      }),
    };

    /* Recent loans shape */
    const recentLoansClean = recentLoans.map((l) => {
      const m = l.memberId as unknown as {
        memberId: string;
        firstName: string;
        lastName: string;
      } | null;
      const u = l.appliedBy as unknown as { name: string; role: string } | null;
      return {
        _id: l._id,
        loanId: l.loanId,
        status: l.status,
        loanAmount: l.loanAmount,
        purpose: l.purpose,
        applicationDate: l.applicationDate,
        memberName: m ? `${m.firstName} ${m.lastName}` : "Unknown",
        memberId: m?.memberId ?? "",
        appliedByName: u?.name ?? "",
      };
    });

    /* Recent transactions shape */
    const recentTxClean = recentTx.map((t) => {
      const m = t.memberId as unknown as {
        memberId: string;
        firstName: string;
        lastName: string;
      } | null;
      const a = t.accountId as unknown as {
        accountNumber: string;
        accountType: string;
        accountName: string;
      } | null;
      return {
        _id: t._id,
        transactionType: t.transactionType,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        date: t.date,
        memberName: m ? `${m.firstName} ${m.lastName}` : "Unknown",
        memberId: m?.memberId ?? "",
        accountNumber: a?.accountNumber ?? "",
        accountType: a?.accountType ?? "",
        accountName: a?.accountName ?? "",
      };
    });

    /* ── Final response ── */
    return NextResponse.json({
      success: true,
      generatedAt: now.toISOString(),

      members: {
        total: totalMembers,
        active: activeMembers,
        inactive: inactiveMembers,
        suspended: suspendedMembers,
        newThisMonth: newMembersThisMonth,
        newPrevMonth: newMembersPrevMonth,
        pctChange: pctChange(newMembersThisMonth, newMembersPrevMonth),
      },

      savings: {
        totalAccounts,
        activeAccounts,
        dormantAccounts,
        closedAccounts,
        totalBalance: balanceAgg[0]?.total ?? 0,
        depositsToday,
        withdrawalsToday,
        netToday: depositsToday - withdrawalsToday,
        txCountToday,
        depositsThisMonth,
        withdrawalsThisMonth,
        netThisMonth: depositsThisMonth - withdrawalsThisMonth,
        txCountThisMonth,
        pctChangeDeposits: pctChange(
          depositsThisMonth,
          txPrevMap.deposit?.total ?? 0,
        ),
        pctChangeWithdrawals: pctChange(
          withdrawalsThisMonth,
          txPrevMap.withdrawal?.total ?? 0,
        ),
      },

      loans: {
        total: totalLoans,
        pending: loanCounts.pending ?? 0,
        underReview: loanCounts.under_review ?? 0,
        approved: loanCounts.approved ?? 0,
        active: loanCounts.active ?? 0,
        overdue: loanCounts.overdue ?? 0,
        paid: loanCounts.paid ?? 0,
        rejected: loanCounts.rejected ?? 0,
        cancelled: loanCounts.cancelled ?? 0,
        totalDisbursed,
        totalOutstanding,
        totalPaid: totalLoanPaid,
        totalPenalties,
        pctNeedAttention:
          totalLoans > 0
            ? Math.round(
                ((loanCounts.pending +
                  loanCounts.under_review +
                  loanCounts.overdue) /
                  totalLoans) *
                  100,
              )
            : 0,
      },

      repayments: {
        collectedThisMonth: repayThisMonth,
        countThisMonth: repayCountMonth,
        collectedPrevMonth: repayPrevMonth,
        pctChange: pctChange(repayThisMonth, repayPrevMonth),
      },

      sparklineData,
      sparklineLoans,
      recentLoans: recentLoansClean,
      recentTx: recentTxClean,
      alerts,
    });
  } catch (err: unknown) {
    console.error("[GET /api/dashboard/stats]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
