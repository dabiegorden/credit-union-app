/**
 * GET  /api/client/profile   — client views their own full profile
 * PUT  /api/client/profile   — client updates password / contact info
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import SavingsAccount from "@/models/Savingsaccount";
import SavingsTransaction from "@/models/Savingstransaction";
import Loan from "@/models/Loan";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { z } from "zod";

const selfUpdateSchema = z.object({
  phone: z.string().min(10).optional(),
  address: z.string().min(5).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["client"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const client = await Client.findById(auth.user!.userId)
      .select("-password")
      .lean();
    if (!client)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const [accounts, recentTransactions, activeLoans, pendingLoans, paidLoans] =
      await Promise.all([
        SavingsAccount.find({ clientId: client._id }).lean(),
        SavingsTransaction.find({ clientId: client._id })
          .populate("accountId", "accountNumber accountType accountName")
          .sort({ date: -1 })
          .limit(10)
          .lean(),
        Loan.countDocuments({
          clientId: client._id,
          status: { $in: ["active", "overdue"] },
        }),
        Loan.countDocuments({
          clientId: client._id,
          status: { $in: ["pending", "under_review", "approved"] },
        }),
        Loan.countDocuments({ clientId: client._id, status: "paid" }),
      ]);

    return NextResponse.json({
      success: true,
      client,
      accounts,
      recentTransactions,
      loanSummary: { activeLoans, pendingLoans, paidLoans },
    });
  } catch (err) {
    console.error("[GET /api/client/profile]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["client"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const body = await request.json();
    const parsed = selfUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const client = await Client.findById(auth.user!.userId).select("+password");
    if (!client)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    if (parsed.data.phone) client.phone = parsed.data.phone;
    if (parsed.data.address) client.address = parsed.data.address;

    if (parsed.data.newPassword) {
      if (!parsed.data.currentPassword) {
        return NextResponse.json(
          { error: "Current password is required" },
          { status: 400 },
        );
      }
      const valid = await client.comparePassword(parsed.data.currentPassword);
      if (!valid)
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 },
        );
      client.password = parsed.data.newPassword;
    }

    await client.save();
    return NextResponse.json({ success: true, message: "Profile updated" });
  } catch (err) {
    console.error("[PUT /api/client/profile]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
