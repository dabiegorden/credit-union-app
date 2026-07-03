import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import GeneralAccount from "@/models/GeneralAccount";
import SavingsTransaction from "@/models/Savingstransaction";
import { authMiddleware } from "@/middleware/Authmiddleware";

// GET /api/general-account — the credit union's pooled account (admin/staff)
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    // Ensure the singleton exists
    let account = await GeneralAccount.findOne({ key: "MAIN" }).lean();
    if (!account) {
      const created = await GeneralAccount.create({ key: "MAIN" });
      account = created.toObject();
    }

    // Recent movements across all clients that flowed through the union
    const recent = await SavingsTransaction.find({})
      .populate("clientId", "clientId firstName lastName")
      .populate("recordedBy", "name role staffRole")
      .sort({ date: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ success: true, account, recent });
  } catch (err) {
    console.error("[GET /api/general-account]", err);
    return NextResponse.json(
      { error: "Failed to fetch general account" },
      { status: 500 },
    );
  }
}
