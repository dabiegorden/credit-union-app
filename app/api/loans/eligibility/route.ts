import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import SavingsAccount from "@/models/Savingsaccount";
import SavingsTransaction from "@/models/Savingstransaction";
import Loan from "@/models/Loan";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { calculateEligibility } from "@/lib/loanEligibility"; // ← fixed path

export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const requestedAmount = parseFloat(searchParams.get("amount") || "0");

    let client;

    if (auth.user?.role === "client") {
      // Client's _id IS their userId in the JWT
      client = await Client.findById(auth.user.userId);
    } else {
      const clientId = searchParams.get("clientId");
      if (!clientId) {
        return NextResponse.json(
          { error: "clientId is required" },
          { status: 400 },
        );
      }
      client = await Client.findById(clientId);
    }

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (client.status !== "active") {
      return NextResponse.json(
        { error: "Client account is not active", eligible: false },
        { status: 400 },
      );
    }

    const savingsAccounts = await SavingsAccount.find({
      clientId: client._id,
      status: "active",
    }).lean();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [deposits6m, depositCount6m] = await Promise.all([
      SavingsTransaction.aggregate([
        {
          $match: {
            clientId: client._id,
            transactionType: "deposit",
            date: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]),
      SavingsTransaction.countDocuments({
        clientId: client._id,
        transactionType: "deposit",
        date: { $gte: sixMonthsAgo },
      }),
    ]);

    const [completedLoans, defaultedLoans, activeLoans, pendingLoans] =
      await Promise.all([
        Loan.countDocuments({ clientId: client._id, status: "paid" }),
        Loan.countDocuments({ clientId: client._id, status: "overdue" }),
        Loan.countDocuments({
          clientId: client._id,
          status: { $in: ["active", "approved"] },
        }),
        Loan.countDocuments({
          clientId: client._id,
          status: { $in: ["pending", "under_review"] },
        }),
      ]);

    const result = calculateEligibility({
      clientJoinDate: client.createdAt,
      savingsBalance: client.savingsBalance || 0,
      activeAccountCount: savingsAccounts.length,
      requestedAmount: requestedAmount || client.savingsBalance || 1,
      totalDeposits6Months: deposits6m[0]?.total || 0,
      depositCount6Months: depositCount6m,
      completedLoans,
      defaultedLoans,
      activeLoans,
      pendingLoans,
    });

    return NextResponse.json({
      success: true,
      client: {
        _id: client._id,
        clientId: client.clientId,
        firstName: client.firstName,
        lastName: client.lastName,
        savingsBalance: client.savingsBalance,
        activeAccountCount: savingsAccounts.length,
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
          totalDeposits6Months: deposits6m[0]?.total || 0,
          depositCount6Months: depositCount6m,
        },
      },
    });
  } catch (err) {
    console.error("[GET /api/loans/eligibility]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
