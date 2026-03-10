/**
 * GET /api/reports/transactions
 *
 * Returns aggregated transaction data for charts + tabular export.
 * Admin and Staff only.
 *
 * Query params:
 *   from        — ISO date string (default: 30 days ago)
 *   to          — ISO date string (default: today)
 *   groupBy     — "day" | "week" | "month" (default: "day")
 *   accountType — "regular" | "fixed" | "susu" | "" (all)
 *   memberId    — filter by specific member
 *   export      — "1" → returns flat rows for Excel, "0" → returns aggregates
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SavingsTransaction from "@/models/Savingstransaction";
import SavingsAccount from "@/models/Savingsaccount";
import Member from "@/models/Member";
import { authMiddleware } from "@/middleware/Authmiddleware";

// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const { searchParams } = new URL(request.url);

    /* ── Date range ── */
    const toDate = searchParams.get("to")
      ? new Date(searchParams.get("to")! + "T23:59:59Z")
      : new Date();
    const fromDate = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groupBy = (searchParams.get("groupBy") || "day") as
      | "day"
      | "week"
      | "month";
    const accountType = searchParams.get("accountType") || "";
    const memberIdStr = searchParams.get("memberId") || "";
    const isExport = searchParams.get("export") === "1";

    /* ── Base match ── */
    const match: Record<string, unknown> = {
      date: { $gte: fromDate, $lte: toDate },
    };
    if (memberIdStr)
      match.memberId = new (await import("mongoose")).default.Types.ObjectId(
        memberIdStr,
      );

    /* If accountType filter, find matching accountIds first */
    if (accountType) {
      const accounts = await SavingsAccount.find({ accountType })
        .select("_id")
        .lean();
      match.accountId = { $in: accounts.map((a) => a._id) };
    }

    /* ── Export mode — return flat rows ── */
    if (isExport) {
      const rows = await SavingsTransaction.find(match)
        .populate("memberId", "memberId firstName lastName email")
        .populate("accountId", "accountNumber accountType accountName")
        .populate("recordedBy", "name role")
        .sort({ date: -1 })
        .limit(10000)
        .lean();

      const flat = rows.map((r) => {
        const m = r.memberId as unknown as {
          memberId: string;
          firstName: string;
          lastName: string;
          email: string;
        } | null;
        const a = r.accountId as unknown as {
          accountNumber: string;
          accountType: string;
          accountName: string;
        } | null;
        const u = r.recordedBy as unknown as {
          name: string;
          role: string;
        } | null;
        return {
          Date: r.date ? new Date(r.date).toISOString().split("T")[0] : "",
          Type: r.transactionType,
          Amount: r.amount,
          "Balance After": r.balanceAfter,
          "Member ID": m?.memberId ?? "",
          "Member Name": m ? `${m.firstName} ${m.lastName}` : "",
          "Member Email": m?.email ?? "",
          "Account Number": a?.accountNumber ?? "",
          "Account Type": a?.accountType ?? "",
          "Account Name": a?.accountName ?? "",
          "Recorded By": u?.name ?? "",
          Role: u?.role ?? "",
          Description: r.description ?? "",
        };
      });

      return NextResponse.json({
        success: true,
        rows: flat,
        count: flat.length,
      });
    }

    /* ── Aggregate mode ── */

    /* 1. Time-series: deposits vs withdrawals per period */
    const dateFormat: Record<string, string> = {
      day: "%Y-%m-%d",
      week: "%Y-%U",
      month: "%Y-%m",
    };

    const timeSeries = await SavingsTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            period: {
              $dateToString: { format: dateFormat[groupBy], date: "$date" },
            },
            type: "$transactionType",
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.period": 1 } },
    ]);

    /* Pivot time-series into [{period, deposits, withdrawals, net}] */
    const periodMap: Record<
      string,
      {
        period: string;
        deposits: number;
        withdrawals: number;
        depositCount: number;
        withdrawalCount: number;
      }
    > = {};
    for (const row of timeSeries) {
      const p = row._id.period;
      if (!periodMap[p])
        periodMap[p] = {
          period: p,
          deposits: 0,
          withdrawals: 0,
          depositCount: 0,
          withdrawalCount: 0,
        };
      if (row._id.type === "deposit") {
        periodMap[p].deposits += row.total;
        periodMap[p].depositCount += row.count;
      }
      if (row._id.type === "withdrawal") {
        periodMap[p].withdrawals += row.total;
        periodMap[p].withdrawalCount += row.count;
      }
    }
    const timeSeriesData = Object.values(periodMap).map((p) => ({
      ...p,
      net: p.deposits - p.withdrawals,
    }));

    /* 2. Type breakdown totals */
    const typeTotals = await SavingsTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$transactionType",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
          avgAmount: { $avg: "$amount" },
        },
      },
    ]);

    /* 3. Account type breakdown */
    const accountTypeBreakdown = await SavingsTransaction.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "savingsaccounts",
          localField: "accountId",
          foreignField: "_id",
          as: "account",
        },
      },
      { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$account.accountType",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    /* 4. Top 10 most active members */
    const topMembers = await SavingsTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$memberId",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
          deposits: {
            $sum: {
              $cond: [{ $eq: ["$transactionType", "deposit"] }, "$amount", 0],
            },
          },
          withdrawals: {
            $sum: {
              $cond: [
                { $eq: ["$transactionType", "withdrawal"] },
                "$amount",
                0,
              ],
            },
          },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "members",
          localField: "_id",
          foreignField: "_id",
          as: "member",
        },
      },
      { $unwind: "$member" },
      {
        $project: {
          memberId: "$member.memberId",
          name: { $concat: ["$member.firstName", " ", "$member.lastName"] },
          totalAmount: 1,
          count: 1,
          deposits: 1,
          withdrawals: 1,
        },
      },
    ]);

    /* 5. Summary KPIs */
    const summary = await SavingsTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalVolume: { $sum: "$amount" },
          totalCount: { $sum: 1 },
          totalDeposits: {
            $sum: {
              $cond: [{ $eq: ["$transactionType", "deposit"] }, "$amount", 0],
            },
          },
          totalWithdrawals: {
            $sum: {
              $cond: [
                { $eq: ["$transactionType", "withdrawal"] },
                "$amount",
                0,
              ],
            },
          },
          depositCount: {
            $sum: { $cond: [{ $eq: ["$transactionType", "deposit"] }, 1, 0] },
          },
          withdrawalCount: {
            $sum: {
              $cond: [{ $eq: ["$transactionType", "withdrawal"] }, 1, 0],
            },
          },
          avgTransaction: { $avg: "$amount" },
          maxTransaction: { $max: "$amount" },
        },
      },
    ]);

    const kpis = summary[0] ?? {
      totalVolume: 0,
      totalCount: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      depositCount: 0,
      withdrawalCount: 0,
      avgTransaction: 0,
      maxTransaction: 0,
    };

    return NextResponse.json({
      success: true,
      period: { from: fromDate, to: toDate, groupBy },
      kpis: { ...kpis, net: kpis.totalDeposits - kpis.totalWithdrawals },
      timeSeriesData,
      typeTotals,
      accountTypeBreakdown,
      topMembers,
    });
  } catch (err: unknown) {
    console.error("[GET /api/reports/transactions]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
