import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SavingsAccount from "@/models/Savingsaccount";
import SavingsTransaction from "@/models/Savingstransaction";
import Member from "@/models/Member";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { z } from "zod";

const updateTxSchema = z.object({
  description: z.string().trim().optional(),
  date: z.string().optional(),
});

// ─── GET /api/savings/transactions/[id] ──────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    await connectDB();

    const transaction = await SavingsTransaction.findById(id)
      .populate(
        "accountId",
        "accountNumber accountType accountName balance status",
      )
      .populate("memberId", "memberId firstName lastName email")
      .populate("recordedBy", "name email role")
      .lean();

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // Members can only see their own transactions
    if (auth.user?.role === "member") {
      const member = await Member.findOne({ userId: auth.user.userId });
      const txMemberId = (
        transaction.memberId as { _id: unknown }
      )._id?.toString();
      if (!member || member._id.toString() !== txMemberId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    console.error("GET /api/savings/transactions/[id]:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 },
    );
  }
}

// ─── PUT /api/savings/transactions/[id] ──────────────────────────────────────
// Admin / Staff — only description and date are editable (amounts are immutable)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    await connectDB();

    const body = await request.json();
    const parsed = updateTxSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const transaction = await SavingsTransaction.findById(id);
    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    if (parsed.data.description !== undefined) {
      transaction.description = parsed.data.description;
    }
    if (parsed.data.date) {
      transaction.date = new Date(parsed.data.date);
    }

    await transaction.save();
    await transaction.populate(
      "accountId",
      "accountNumber accountType accountName",
    );
    await transaction.populate("memberId", "memberId firstName lastName");
    await transaction.populate("recordedBy", "name email role");

    return NextResponse.json({
      success: true,
      message: "Transaction updated",
      transaction,
    });
  } catch (error) {
    console.error("PUT /api/savings/transactions/[id]:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/savings/transactions/[id] ───────────────────────────────────
// Admin only — reverses the transaction and restores account + member balance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin"]);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    await connectDB();

    const transaction = await SavingsTransaction.findById(id);
    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    const account = await SavingsAccount.findById(transaction.accountId);
    if (!account) {
      return NextResponse.json(
        { error: "Associated account not found" },
        { status: 404 },
      );
    }

    // Reverse the effect on the account balance
    const reversalAmount =
      transaction.transactionType === "deposit"
        ? -transaction.amount // undo deposit  → subtract
        : +transaction.amount; // undo withdrawal → add back

    const newAccountBalance = account.balance + reversalAmount;

    if (newAccountBalance < 0) {
      return NextResponse.json(
        {
          error:
            "Cannot reverse this transaction — it would result in a negative balance",
        },
        { status: 400 },
      );
    }

    account.balance = newAccountBalance;
    await account.save();

    // Keep Member.savingsBalance in sync
    await Member.findByIdAndUpdate(transaction.memberId, {
      $inc: { savingsBalance: reversalAmount },
    });

    await SavingsTransaction.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Transaction reversed and deleted successfully",
      newAccountBalance,
    });
  } catch (error) {
    console.error("DELETE /api/savings/transactions/[id]:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 },
    );
  }
}
