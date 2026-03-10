import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SavingsAccount from "@/models/Savingsaccount";
import SavingsTransaction from "@/models/Savingstransaction";
import Member from "@/models/Member";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { z } from "zod";

const transactionSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  transactionType: z.enum(["deposit", "withdrawal"]),
  amount: z.number().positive("Amount must be greater than 0"),
  description: z.string().trim().optional(),
  date: z.string().optional(), // ISO string — defaults to now
});

// ─── GET /api/savings/transactions ───────────────────────────────────────────
// Admin/Staff: all transactions, paginated + filterable
// Member: their own transactions only
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const accountId = searchParams.get("accountId") || "";
    const type = searchParams.get("type") || ""; // deposit | withdrawal
    const memberId = searchParams.get("memberId") || "";
    const from = searchParams.get("from") || ""; // ISO date
    const to = searchParams.get("to") || ""; // ISO date

    const query: Record<string, unknown> = {};

    // Members see only their own transactions
    if (auth.user?.role === "member") {
      const member = await Member.findOne({ userId: auth.user.userId });
      if (!member) {
        return NextResponse.json(
          { error: "Member profile not found" },
          { status: 404 },
        );
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
// All authenticated roles can deposit.
// Only admin / staff can do withdrawals.
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

    // Members can only deposit — never withdraw
    if (auth.user?.role === "member" && transactionType === "withdrawal") {
      return NextResponse.json(
        { error: "Members cannot record withdrawals. Please contact staff." },
        { status: 403 },
      );
    }

    // Fetch and lock the account
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

    // Members may only transact on their own accounts
    if (auth.user?.role === "member") {
      const member = await Member.findOne({ userId: auth.user.userId });
      if (!member || member._id.toString() !== account.memberId.toString()) {
        return NextResponse.json(
          { error: "Forbidden – cannot transact on another member's account" },
          { status: 403 },
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

    // Also keep the Member.savingsBalance in sync (sum across all accounts is
    // expensive at scale; we add/subtract the delta here for performance).
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
      recordedBy: auth.user?.userId,
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
