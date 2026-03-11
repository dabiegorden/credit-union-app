/**
 * POST /api/admin/members/link
 *
 * Links a User account (by email or userId) to a Member document.
 * Admin only.
 *
 * Body: { userId: string, memberId: string }
 *   userId  — the User._id (from /api/admin/users listing)
 *   memberId — the Member._id (from /api/members listing)
 *
 * Place at: src/app/api/admin/members/link/route.ts
 *
 * This solves the case where a member registers/is created as a User
 * but their Member record was created independently by admin with a
 * different email, so the email fallback also fails.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import User from "@/models/User";
import { authMiddleware } from "@/middleware/Authmiddleware";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const body = await request.json();
    const { userId, memberId } = body;

    if (!userId || !memberId) {
      return NextResponse.json(
        { error: "userId and memberId are required" },
        { status: 400 },
      );
    }

    const [user, member] = await Promise.all([
      User.findById(userId).select("name email role").lean(),
      Member.findById(memberId),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if Member is already linked to a DIFFERENT user
    if (member.userId && member.userId.toString() !== userId) {
      return NextResponse.json(
        {
          error: `Member is already linked to a different User account`,
        },
        { status: 409 },
      );
    }

    // Check if this User is already linked to a DIFFERENT member
    const existingLink = await Member.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      _id: { $ne: memberId },
    });
    if (existingLink) {
      return NextResponse.json(
        {
          error: `This User is already linked to Member ${existingLink.memberId}`,
        },
        { status: 409 },
      );
    }

    member.userId = new mongoose.Types.ObjectId(userId) as any;
    await member.save();

    return NextResponse.json({
      success: true,
      message: `User "${(user as any).name}" successfully linked to Member "${member.memberId} — ${member.firstName} ${member.lastName}"`,
      member: {
        _id: member._id,
        memberId: member.memberId,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        userId: member.userId,
      },
    });
  } catch (err) {
    console.error("[POST /api/admin/members/link]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/members/link?userId=xxx
 * Returns member link status for a given user — useful for the admin UI
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const user = await User.findById(userId).select("name email role").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check both link strategies
    let member = null;
    if (mongoose.isValidObjectId(userId)) {
      member = await Member.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      }).lean();
    }
    if (!member) {
      member = await Member.findOne({ email: (user as any).email }).lean();
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: (user as any)._id,
        name: (user as any).name,
        email: (user as any).email,
        role: (user as any).role,
      },
      linked: !!member,
      member: member
        ? {
            _id: (member as any)._id,
            memberId: (member as any).memberId,
            firstName: (member as any).firstName,
            lastName: (member as any).lastName,
            email: (member as any).email,
          }
        : null,
    });
  } catch (err) {
    console.error("[GET /api/admin/members/link]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
