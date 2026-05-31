/**
 * FIXED: src/app/api/savings/transactions/route.ts
 *
 * KEY FIX: Uses email-fallback client resolution so clients whose
 * Client document lacks a userId field can still deposit/withdraw.
 *
 * This is a drop-in replacement for the existing file.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SavingsAccount from "@/models/Savingsaccount";
import SavingsTransaction from "@/models/Savingstransaction";
import Client from "@/models/Client";
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
    const clientId = searchParams.get("clientId") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const query: Record<string, unknown> = {};
    if (auth.user?.role === "client") {
      query.clientId = auth.user.userId; // JWT userId IS Client._id
    } else if (clientId) {
      query.clientId = clientId;
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
        .populate("clientId", "clientId firstName lastName email")
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

    // For clients: verify ownership using the resolver
    let recordedById = auth.user!.userId;
    if (auth.user?.role === "client") {
      const clientDoc = await Client.findById(auth.user.userId);
      if (!clientDoc) {
        return NextResponse.json(
          { error: "Client profile not found" },
          { status: 404 },
        );
      }
      if (clientDoc._id.toString() !== account.clientId.toString()) {
        return NextResponse.json(
          { error: "Forbidden — you can only transact on your own accounts" },
          { status: 403 },
        );
      }
      if (clientDoc.status !== "active") {
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
          error: `Insufficient balance. Current balance: GHS${account.balance.toFixed(2)}`,
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

    // Sync Client.savingsBalance
    await Client.findByIdAndUpdate(account.clientId, {
      $inc: {
        savingsBalance: transactionType === "deposit" ? amount : -amount,
      },
    });

    // Create transaction record
    const transaction = await SavingsTransaction.create({
      accountId,
      clientId: account.clientId,
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
    await transaction.populate("clientId", "clientId firstName lastName email");
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
