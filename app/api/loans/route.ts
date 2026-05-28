/**
 * GET  /api/loans  — list loans
 * POST /api/loans  — apply for a loan
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import Client from "@/models/Client";
import SavingsAccount from "@/models/Savingsaccount";
import SavingsTransaction from "@/models/Savingstransaction";
import { authMiddleware } from "@/middleware/Authmiddleware";
import {
  calculateEligibility,
  calcRepaymentSchedule,
  getAmountSurcharge,
} from "@/lib/loanEligibility";
import { z } from "zod";

const applySchema = z.object({
  clientId: z.string().min(1),
  loanAmount: z.number().positive(),
  loanDurationMonths: z.number().int().min(1).max(60),
  purpose: z.enum([
    "business",
    "education",
    "medical",
    "housing",
    "personal",
    "agriculture",
    "other",
  ]),
  purposeDescription: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(500).optional(),
  // Staff/admin can override the rate. If omitted, system calculates.
  interestRateOverride: z.number().min(0).max(100).optional(),
});

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
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search")?.trim() || "";

    const query: Record<string, unknown> = {};

    if (auth.user?.role === "client") {
      query.clientId = auth.user.userId;
    } else {
      const clientIdParam = searchParams.get("clientId");
      if (clientIdParam) query.clientId = clientIdParam;
    }

    if (status) query.status = status;

    if (search && auth.user?.role !== "client") {
      const matchingClients = await Client.find({
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { clientId: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      query.$or = [
        { loanId: { $regex: search, $options: "i" } },
        { clientId: { $in: matchingClients.map((c) => c._id) } },
      ];
    }

    const [total, loans] = await Promise.all([
      Loan.countDocuments(query),
      Loan.find(query)
        .populate(
          "clientId",
          "clientId firstName lastName email phone savingsBalance",
        )
        .populate("appliedBy", "name role")
        .populate("reviewedBy", "name role")
        .populate("approvedBy", "name role")
        .sort({ applicationDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      loans,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[GET /api/loans]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const body = await request.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      clientId,
      loanAmount,
      loanDurationMonths,
      purpose,
      purposeDescription,
      notes,
      interestRateOverride,
    } = parsed.data;

    // Clients can only apply for themselves
    const resolvedClientId =
      auth.user?.role === "client" ? auth.user.userId : clientId;

    const client = await Client.findById(resolvedClientId);
    if (!client)
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (client.status !== "active") {
      return NextResponse.json(
        { error: "Only active clients can apply for loans" },
        { status: 400 },
      );
    }

    const existing = await Loan.findOne({
      clientId: client._id,
      status: { $in: ["pending", "under_review"] },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: `Client already has a pending application (${existing.loanId})`,
        },
        { status: 409 },
      );
    }

    // Gather data for eligibility
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      savingsAccounts,
      depositAgg,
      depositCount6m,
      completedLoans,
      defaultedLoans,
      activeLoans,
    ] = await Promise.all([
      SavingsAccount.find({ clientId: client._id, status: "active" }).lean(),
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
      Loan.countDocuments({ clientId: client._id, status: "paid" }),
      Loan.countDocuments({ clientId: client._id, status: "overdue" }),
      Loan.countDocuments({
        clientId: client._id,
        status: { $in: ["active", "approved"] },
      }),
    ]);

    const eligibility = calculateEligibility({
      clientJoinDate: client.createdAt,
      savingsBalance: client.savingsBalance || 0,
      activeAccountCount: savingsAccounts.length,
      requestedAmount: loanAmount,
      totalDeposits6Months: depositAgg[0]?.total || 0,
      depositCount6Months: depositCount6m,
      completedLoans,
      defaultedLoans,
      activeLoans,
      pendingLoans: 0,
    });

    if (auth.user?.role === "client" && !eligibility.eligible) {
      return NextResponse.json(
        {
          error: "Not eligible for a loan at this time",
          score: eligibility.score,
          flags: eligibility.flags,
        },
        { status: 422 },
      );
    }

    // Interest rate: manual override takes priority, then system suggestion
    const finalInterestRate =
      interestRateOverride ?? eligibility.suggestedInterestRate;
    const amountSurcharge = getAmountSurcharge(loanAmount);
    const schedule = calcRepaymentSchedule(
      loanAmount,
      finalInterestRate,
      loanDurationMonths,
    );

    const loan = new Loan({
      clientId: client._id,
      loanAmount,
      loanDurationMonths,
      purpose,
      purposeDescription,
      notes,
      baseInterestRate: eligibility.baseInterestRate,
      amountSurcharge,
      finalInterestRate,
      interestRateSetBy:
        interestRateOverride !== undefined ? auth.user!.userId : undefined,
      monthlyRepayment: schedule.monthlyRepayment,
      totalPayable: schedule.totalPayable,
      totalInterest: schedule.totalInterest,
      outstandingBalance: schedule.totalPayable,
      status: "pending",
      eligibilityScore: eligibility.score,
      savingsBalanceAtApplication: client.savingsBalance || 0,
      creditHistory: eligibility.creditHistory,
      appliedBy: auth.user!.userId,
    });

    await loan.save();
    await loan.populate("clientId", "clientId firstName lastName email");

    return NextResponse.json(
      {
        success: true,
        message: "Loan application submitted",
        loan,
        eligibility,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/loans]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
