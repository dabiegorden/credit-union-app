/**
 * FIXED: src/app/api/savings/accounts/route.ts
 *
 * KEY FIX: Uses email-fallback member resolution for the member GET path.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { z } from "zod";
import Member from "@/models/Member";
import User from "@/models/User";
import Savingsaccount from "@/models/Savingsaccount";
import mongoose from "mongoose";

const createAccountSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  accountType: z.enum(["regular", "fixed", "susu"]).default("regular"),
  accountName: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

/** Resolve Member by userId OR email fallback */
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

// ─── GET /api/savings/accounts ────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";

    // Members can only see their own accounts
    if (auth.user?.role === "member") {
      const member = await resolveMember(auth.user.userId);
      if (!member) {
        return NextResponse.json(
          { error: "Member profile not found" },
          { status: 404 },
        );
      }

      const accounts = await Savingsaccount.find({ memberId: member._id })
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({ success: true, accounts });
    }

    // Admin / Staff — full list with filters
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (type) query.accountType = type;

    if (search) {
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
        { accountNumber: { $regex: search, $options: "i" } },
        { memberId: { $in: memberIds } },
      ];
    }

    const [total, accounts] = await Promise.all([
      Savingsaccount.countDocuments(query),
      Savingsaccount.find(query)
        .populate("memberId", "memberId firstName lastName email phone status")
        .populate("openedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      accounts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/savings/accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 },
    );
  }
}

// ─── POST /api/savings/accounts ───────────────────────────────────────────────
// Admin / Staff only — open a new savings account for a member
export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const body = await request.json();
    const parsed = createAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { memberId, accountType, accountName, description } = parsed.data;

    const member = await Member.findById(memberId);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (member.status !== "active") {
      return NextResponse.json(
        { error: "Cannot open account for an inactive or suspended member" },
        { status: 400 },
      );
    }

    const duplicate = await Savingsaccount.findOne({
      memberId,
      accountType,
      status: { $ne: "closed" },
    });
    if (duplicate) {
      return NextResponse.json(
        {
          error: `Member already has an active ${accountType} savings account`,
        },
        { status: 409 },
      );
    }

    const defaultName =
      accountType === "regular"
        ? "Regular Savings"
        : accountType === "fixed"
          ? "Fixed Deposit"
          : "Susu Savings";

    const account = await Savingsaccount.create({
      memberId,
      accountType,
      accountName: accountName || defaultName,
      openedBy: auth.user?.userId,
      description,
    });

    await account.populate("memberId", "memberId firstName lastName email");
    await account.populate("openedBy", "name email role");

    return NextResponse.json(
      {
        success: true,
        message: "Savings account opened successfully",
        account,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/savings/accounts:", error);
    return NextResponse.json(
      { error: "Failed to create savings account" },
      { status: 500 },
    );
  }
}
