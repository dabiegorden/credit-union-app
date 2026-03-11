/**
 * FIXED: src/app/api/savings/transactions/route.ts
 *
 * KEY FIX: Uses email-fallback member resolution so members whose
 * Member document lacks a userId field can still deposit/withdraw.
 *
 * This is a drop-in replacement for the existing file.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SavingsAccount from "@/models/Savingsaccount";
import SavingsTransaction from "@/models/Savingstransaction";
import Member from "@/models/Member";
import User from "@/models/User";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { z } from "zod";
import mongoose from "mongoose";

const transactionSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  transactionType: z.enum(["deposit", "withdrawal"]),
  amount: z.number().positive("Amount must be greater than 0"),
  description: z.string().trim().optional(),
  date: z.string().optional(),
});

/** Resolve Member by userId OR email fallback — shared pattern */
async function resolveMember(userId: string) {
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

// ─── GET /api/savings/transactions ───────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const accountId = searchParams.get("accountId") || "";
    const type = searchParams.get("type") || "";
    const memberId = searchParams.get("memberId") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const query: Record<string, unknown> = {};

    if (auth.user?.role === "member") {
      const member = await resolveMember(auth.user.userId);
      if (!member) {
        // Return empty rather than 404 — graceful degradation
        return NextResponse.json({
          success: true,
          transactions: [],
          pagination: { total: 0, page: 1, limit, pages: 0 },
        });
      }
      query.memberId = member._id;
    } else {
      if (memberId) query.memberId = memberId;
      if (accountId) query.accountId = accountId;
    }

    if (type) query.transactionType = type;
    if (from || to) {
      const dateRange: Record<string, Date> = {};
      if (from) dateRange.$gte = new Date(from);
      if (to) dateRange.$lte = new Date(to);
      query.date = dateRange;
    }

    const [total, transactions] = await Promise.all([
      SavingsTransaction.countDocuments(query),
      SavingsTransaction.find(query)
        .populate("accountId", "accountNumber accountType accountName")
        .populate("memberId", "memberId firstName lastName email")
        .populate("recordedBy", "name email role")
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      transactions,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/savings/transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
}

// ─── POST /api/savings/transactions ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { accountId, transactionType, amount, description, date } =
      parsed.data;

    // Fetch account
    const account = await SavingsAccount.findById(accountId);
    if (!account) {
      return NextResponse.json(
        { error: "Savings account not found" },
        { status: 404 },
      );
    }
    if (account.status !== "active") {
      return NextResponse.json(
        { error: "Transactions can only be made on active accounts" },
        { status: 400 },
      );
    }

    // For members: verify ownership using the resolver
    let recordedById = auth.user!.userId;
    if (auth.user?.role === "member") {
      const member = await resolveMember(auth.user.userId);
      if (!member) {
        return NextResponse.json(
          { error: "Member profile not found" },
          { status: 404 },
        );
      }
      if (member._id.toString() !== account.memberId.toString()) {
        return NextResponse.json(
          { error: "Forbidden — you can only transact on your own accounts" },
          { status: 403 },
        );
      }
      if (member.status !== "active") {
        return NextResponse.json(
          { error: "Your account is not active. Contact staff." },
          { status: 400 },
        );
      }
    }

    // Balance check for withdrawals
    if (transactionType === "withdrawal" && amount > account.balance) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Current balance: GH₵${account.balance.toFixed(2)}`,
        },
        { status: 400 },
      );
    }

    // Update account balance
    const balanceAfter =
      transactionType === "deposit"
        ? account.balance + amount
        : account.balance - amount;

    account.balance = balanceAfter;
    await account.save();

    // Sync Member.savingsBalance
    await Member.findByIdAndUpdate(account.memberId, {
      $inc: {
        savingsBalance: transactionType === "deposit" ? amount : -amount,
      },
    });

    // Create transaction record
    const transaction = await SavingsTransaction.create({
      accountId,
      memberId: account.memberId,
      transactionType,
      amount,
      balanceAfter,
      recordedBy: new mongoose.Types.ObjectId(recordedById),
      description,
      date: date ? new Date(date) : new Date(),
    });

    await transaction.populate(
      "accountId",
      "accountNumber accountType accountName",
    );
    await transaction.populate("memberId", "memberId firstName lastName email");
    await transaction.populate("recordedBy", "name email role");

    return NextResponse.json(
      {
        success: true,
        message: `${transactionType === "deposit" ? "Deposit" : "Withdrawal"} recorded successfully`,
        transaction,
        newBalance: balanceAfter,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/savings/transactions:", error);
    return NextResponse.json(
      { error: "Failed to record transaction" },
      { status: 500 },
    );
  }
}
