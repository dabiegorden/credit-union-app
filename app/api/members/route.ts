/**
 * FIXED: /api/members/route.ts
 *
 * KEY FIX: When a member logs in, their User account may exist but the Member
 * document may not have userId set (admin creates Member records, then links
 * a User account separately — or sometimes never sets the userId field).
 *
 * Solution: Look up by userId first, then fall back to email match.
 * Also backfills userId on the Member document for future fast lookups.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import User from "@/models/User";
import { z } from "zod";
import { authMiddleware } from "@/middleware/Authmiddleware";
import mongoose from "mongoose";

const createMemberSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email(),
  address: z.string().min(5),
  nationalId: z.string().min(5),
});

/** Resolve Member from a logged-in user ID, with email fallback + backfill */
async function resolveMemberForUser(userId: string) {
  let member = null;

  // 1. Try ObjectId match
  if (mongoose.isValidObjectId(userId)) {
    member = await Member.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  // 2. Fallback: email match
  if (!member) {
    const user = await User.findById(userId).select("email").lean();
    if (user?.email) {
      member = await Member.findOne({ email: (user as any).email });
      // Backfill userId for future lookups
      if (member && !member.userId) {
        await Member.findByIdAndUpdate(member._id, {
          userId: new mongoose.Types.ObjectId(userId),
        });
        (member as any).userId = new mongoose.Types.ObjectId(userId);
      }
    }
  }

  return member;
}

// GET - List members
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff", "member"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    // Members see only their own record
    if (auth.user?.role === "member") {
      const member = await resolveMemberForUser(auth.user.userId);
      if (!member) {
        // Return empty but 200 — let the UI handle "no profile" gracefully
        return NextResponse.json({ members: [] }, { status: 200 });
      }
      return NextResponse.json({ members: [member] }, { status: 200 });
    }

    // Admin / Staff — full list
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20")),
    );

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { memberId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const [total, members] = await Promise.all([
      Member.countDocuments(query),
      Member.find(query)
        .select("-userId")
        .sort({ dateJoined: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    return NextResponse.json(
      {
        members,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET members error:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 },
    );
  }
}

// POST - Create new member (Staff and Admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    const body = await request.json();
    const validatedData = createMemberSchema.parse(body);

    await connectDB();

    const existingMember = await Member.findOne({
      nationalId: validatedData.nationalId,
    });
    if (existingMember) {
      return NextResponse.json(
        { error: "National ID already registered" },
        { status: 400 },
      );
    }

    const existingEmail = await Member.findOne({ email: validatedData.email });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 },
      );
    }

    const count = await Member.countDocuments();
    const memberId = `MEM-${String(count + 1).padStart(5, "0")}`;

    // Check if there's a User account with this email — link it automatically
    const existingUser = await User.findOne({ email: validatedData.email })
      .select("_id")
      .lean();

    const member = await Member.create({
      ...validatedData,
      memberId,
      savingsBalance: 0,
      ...(existingUser ? { userId: (existingUser as any)._id } : {}),
    });

    return NextResponse.json(
      { success: true, message: "Member created successfully", member },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Create member error:", error);
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 },
    );
  }
}
