import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { z } from "zod";
import Savingstransaction from "@/models/Savingstransaction";
import Savingsaccount from "@/models/Savingsaccount";

const updateAccountSchema = z.object({
  accountName: z.string().trim().min(1).optional(),
  status: z.enum(["active", "dormant", "closed"]).optional(),
  description: z.string().trim().optional(),
});

// ─── GET /api/savings/accounts/[id] ──────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    await connectDB();

    const account = await Savingsaccount.findById(id)
      .populate(
        "memberId",
        "memberId firstName lastName email phone status savingsBalance",
      )
      .populate("openedBy", "name email role")
      .lean();

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Members can only view their own accounts
    if (auth.user?.role === "member") {
      const member = await Member.findOne({ userId: auth.user.userId });
      const accMemberId = (
        account.memberId as { _id: unknown }
      )._id?.toString();
      if (!member || member._id.toString() !== accMemberId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Last 10 transactions for the account detail view
    const recentTransactions = await Savingstransaction.find({ accountId: id })
      .populate("recordedBy", "name role")
      .sort({ date: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({ success: true, account, recentTransactions });
  } catch (error) {
    console.error("GET /api/savings/accounts/[id]:", error);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 },
    );
  }
}

// ─── PUT /api/savings/accounts/[id] ──────────────────────────────────────────
// Admin / Staff — update name, status, description
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
    const parsed = updateAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const account = await Savingsaccount.findById(id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Prevent re-opening a closed account
    if (
      account.status === "closed" &&
      parsed.data.status &&
      parsed.data.status !== "closed"
    ) {
      return NextResponse.json(
        { error: "Cannot reopen a closed account" },
        { status: 400 },
      );
    }

    // Prevent closing an account with a non-zero balance
    if (parsed.data.status === "closed" && account.balance > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot close an account with a remaining balance. Withdraw all funds first.",
        },
        { status: 400 },
      );
    }

    const { accountName, status, description } = parsed.data;
    if (accountName !== undefined) account.accountName = accountName;
    if (status !== undefined) account.status = status;
    if (description !== undefined) account.description = description;

    await account.save();
    await account.populate("memberId", "memberId firstName lastName email");
    await account.populate("openedBy", "name email role");

    return NextResponse.json({
      success: true,
      message: "Account updated successfully",
      account,
    });
  } catch (error) {
    console.error("PUT /api/savings/accounts/[id]:", error);
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/savings/accounts/[id] ───────────────────────────────────────
// Admin only — hard delete only if balance is 0 and no transactions
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin"]);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    await connectDB();

    const account = await Savingsaccount.findById(id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (account.balance > 0) {
      return NextResponse.json(
        { error: "Cannot delete an account with a remaining balance" },
        { status: 400 },
      );
    }

    const txCount = await Savingstransaction.countDocuments({ accountId: id });
    if (txCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete an account with existing transactions. Close the account instead.",
        },
        { status: 400 },
      );
    }

    await Savingsaccount.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Savings account deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/savings/accounts/[id]:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }
}
