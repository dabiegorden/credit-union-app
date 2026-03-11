/**
 * GET /api/member/profile
 *
 * ROOT-CAUSE FIX:
 * The problem is that the User document (jscoder49@gmail.com / role:"member")
 * has NO matching Member document. The Member documents in the DB use different
 * emails (johndoe@gmail.com, yawdabie5@gmail.com). So BOTH the userId lookup
 * AND the email fallback fail.
 *
 * The fix is a 3-tier resolution strategy:
 *   1. Member.findOne({ userId: ObjectId(userId) })        — direct link
 *   2. User.email → Member.findOne({ email })              — email match fallback
 *   3. Return a clear "NOT_LINKED" response so the UI can show a helpful message
 *      telling the member to contact staff to link their account.
 *
 * Additionally, the /api/admin/members/link endpoint is provided so an admin
 * can link any User → Member from the admin panel without touching the DB directly.
 *
 * Place this file at: src/app/api/member/profile/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import User from "@/models/User";
import SavingsAccount from "@/models/Savingsaccount";
import SavingsTransaction from "@/models/Savingstransaction";
import Loan from "@/models/Loan";
import { authMiddleware } from "@/middleware/Authmiddleware";
import mongoose from "mongoose";

/**
 * Resolves the Member document for a given User ID.
 * Exported for reuse in loans, savings, etc.
 */
export async function resolveMemberForUser(userId: string) {
  let member = null;

  // Tier 1: userId field on Member document
  if (mongoose.isValidObjectId(userId)) {
    member = await Member.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  // Tier 2: email match (covers admin-created Member records)
  if (!member) {
    const user = await User.findById(userId).select("email").lean();
    const email = (user as { email?: string } | null)?.email;
    if (email) {
      member = await Member.findOne({ email });

      // Backfill userId so Tier 1 works next time
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

export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["member"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const member = await resolveMemberForUser(auth.user!.userId);

    if (!member) {
      // Get the user's name so we can show it in the "not linked" screen
      const user = await User.findById(auth.user!.userId)
        .select("name email")
        .lean();
      return NextResponse.json(
        {
          error: "NOT_LINKED",
          code: "MEMBER_PROFILE_NOT_FOUND",
          userName: (user as any)?.name ?? "Member",
          userEmail: (user as any)?.email ?? "",
          message:
            "Your login account is not yet linked to a Member profile. Please contact staff and provide your email address so they can link your account.",
        },
        { status: 404 },
      );
    }

    const [
      savingsAccounts,
      recentTransactions,
      activeLoans,
      pendingLoans,
      paidLoans,
    ] = await Promise.all([
      SavingsAccount.find({ memberId: member._id }).lean(),
      SavingsTransaction.find({ memberId: member._id })
        .populate("accountId", "accountNumber accountType accountName")
        .sort({ date: -1 })
        .limit(10)
        .lean(),
      Loan.countDocuments({
        memberId: member._id,
        status: { $in: ["active", "overdue"] },
      }),
      Loan.countDocuments({
        memberId: member._id,
        status: { $in: ["pending", "under_review", "approved"] },
      }),
      Loan.countDocuments({ memberId: member._id, status: "paid" }),
    ]);

    return NextResponse.json({
      success: true,
      member: {
        _id: member._id,
        memberId: member.memberId,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        address: member.address,
        nationalId: member.nationalId,
        photo: member.photo ?? null,
        dateJoined: member.dateJoined,
        status: member.status,
        savingsBalance: member.savingsBalance,
      },
      savingsAccounts,
      recentTransactions,
      loanSummary: { activeLoans, pendingLoans, paidLoans },
    });
  } catch (err) {
    console.error("[GET /api/member/profile]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
