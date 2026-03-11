/**
 * GET /api/loans  — list loans (paginated + filtered)
 * POST /api/loans — submit a loan application
 *
 * KEY FIX: Member lookup now uses the same email-fallback strategy
 * as the members API, so members whose Member document lacks a userId
 * can still apply for and view loans.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import Member from "@/models/Member";
import User from "@/models/User";
import SavingsAccount from "@/models/Savingsaccount";
import SavingsTransaction from "@/models/Savingstransaction";
import { authMiddleware } from "@/middleware/Authmiddleware";
import {
  calculateEligibility,
  calcRepaymentSchedule,
} from "@/models/LoanEligibility";
import { z } from "zod";
import mongoose from "mongoose";

/* ── Shared member resolver (same pattern as /api/members) ── */
async function resolveMemberForUser(userId: string) {
  let member = null;
  if (mongoose.isValidObjectId(userId)) {
    member = await Member.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
  }
  if (!member) {
    const user = await User.findById(userId).select("email").lean();
    const email = (user as { email?: string } | null)?.email;
    if (email) {
      member = await Member.findOne({ email });
      if (member && !member.userId) {
        await Member.findByIdAndUpdate(member._id, {
          userId: new mongoose.Types.ObjectId(userId),
        });
        member.userId = new mongoose.Types.ObjectId(userId) as any;
      }
    }
  }
  return member;
}

/* ── Validation schema ── */
const applySchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  loanAmount: z.number().positive("Loan amount must be positive"),
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
  interestRateOverride: z.number().min(0).max(100).optional(),
});

// ─── GET /api/loans ──────────────────────────────────────────────────────────
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
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const query: Record<string, unknown> = {};

    /* Member sees only their own loans */
    if (auth.user?.role === "member") {
      const member = await resolveMemberForUser(auth.user.userId);
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

    if (status) query.status = status;

    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(from);
      if (to) range.$lte = new Date(to + "T23:59:59Z");
      query.applicationDate = range;
    }

    if (search && auth.user?.role !== "member") {
      const matchingMembers = await Member.find({
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { memberId: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const memberIds = matchingMembers.map((m) => m._id);

      query.$or = [
        { loanId: { $regex: search, $options: "i" } },
        { memberId: { $in: memberIds } },
      ];
    }

    const [total, loans] = await Promise.all([
      Loan.countDocuments(query),
      Loan.find(query)
        .populate(
          "memberId",
          "memberId firstName lastName email phone savingsBalance",
        )
        .populate("appliedBy", "name email role")
        .populate("reviewedBy", "name email role")
        .populate("approvedBy", "name email role")
        .sort({ applicationDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      loans,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/loans]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── POST /api/loans ─────────────────────────────────────────────────────────
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
      memberId,
      loanAmount,
      loanDurationMonths,
      purpose,
      purposeDescription,
      notes,
      interestRateOverride,
    } = parsed.data;

    /* ── Resolve member ── */
    let member;
    if (auth.user?.role === "member") {
      // Members can only apply for themselves — use the resolver
      member = await resolveMemberForUser(auth.user.userId);
    } else {
      member = await Member.findById(memberId);
    }

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (member.status !== "active") {
      return NextResponse.json(
        { error: "Only active members can apply for loans" },
        { status: 400 },
      );
    }

    /* ── Check for duplicate pending/under_review application ── */
    const existingPending = await Loan.findOne({
      memberId: member._id,
      status: { $in: ["pending", "under_review"] },
    });
    if (existingPending) {
      return NextResponse.json(
        {
          error:
            "Member already has a pending loan application (ID: " +
            existingPending.loanId +
            ")",
        },
        { status: 409 },
      );
    }

    /* ── Run eligibility ── */
    const savingsAccounts = await SavingsAccount.find({
      memberId: member._id,
      status: "active",
    }).lean();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      depositAgg,
      depositCount6m,
      completedLoans,
      defaultedLoans,
      activeLoans,
    ] = await Promise.all([
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
      Loan.countDocuments({ memberId: member._id, status: "paid" }),
      Loan.countDocuments({ memberId: member._id, status: "overdue" }),
      Loan.countDocuments({
        memberId: member._id,
        status: { $in: ["active", "approved"] },
      }),
    ]);

    const eligibility = calculateEligibility({
      memberJoinDate: member.dateJoined || member.createdAt,
      savingsBalance: member.savingsBalance || 0,
      activeAccountCount: savingsAccounts.length,
      requestedAmount: loanAmount,
      totalDeposits6Months: depositAgg[0]?.total || 0,
      depositCount6Months: depositCount6m,
      completedLoans,
      defaultedLoans,
      activeLoans,
      pendingLoans: 0,
    });

    /* ── Members must be eligible (score >= 50) ── */
    if (auth.user?.role === "member" && !eligibility.eligible) {
      return NextResponse.json(
        {
          error: "Loan application not eligible based on current credit score",
          score: eligibility.score,
          flags: eligibility.flags,
          creditHistory: eligibility.creditHistory,
        },
        { status: 422 },
      );
    }

    /* ── Calculate repayment schedule ── */
    const rate = interestRateOverride ?? eligibility.interestRate;
    const schedule = calcRepaymentSchedule(
      loanAmount,
      rate,
      loanDurationMonths,
    );

    /* ── Create loan document ── */
    const loan = new Loan({
      memberId: member._id,
      loanAmount,
      interestRate: rate,
      loanDurationMonths,
      purpose,
      purposeDescription,
      monthlyRepayment: schedule.monthlyRepayment,
      totalPayable: schedule.totalPayable,
      totalInterest: schedule.totalInterest,
      outstandingBalance: schedule.totalPayable,
      status: "pending",
      eligibilityScore: eligibility.score,
      savingsBalanceAtApplication: member.savingsBalance || 0,
      creditHistory: eligibility.creditHistory,
      notes,
      appliedBy: auth.user!.userId,
    });

    await loan.save();

    await loan.populate("memberId", "memberId firstName lastName email");
    await loan.populate("appliedBy", "name email role");

    return NextResponse.json(
      {
        success: true,
        message: "Loan application submitted successfully",
        loan,
        eligibility,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("[POST /api/loans]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
