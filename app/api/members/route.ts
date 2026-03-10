import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import { z } from "zod";
import { authMiddleware } from "@/middleware/Authmiddleware";

const createMemberSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email(),
  address: z.string().min(5),
  nationalId: z.string().min(5),
});

// GET - List all members
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff", "member"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    let query: any = {};

    // Members can only see their own record
    if (auth.user?.role === "member") {
      const member = await Member.findOne({ userId: auth.user.userId });
      if (member) {
        query._id = member._id;
      } else {
        return NextResponse.json({ members: [] }, { status: 200 });
      }
    }

    const members = await Member.find(query)
      .select("-userId")
      .sort({ dateJoined: -1 });

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error("Get members error:", error);
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

    // Check for duplicate National ID
    const existingMember = await Member.findOne({
      nationalId: validatedData.nationalId,
    });
    if (existingMember) {
      return NextResponse.json(
        { error: "National ID already registered" },
        { status: 400 },
      );
    }

    // Check for duplicate email
    const existingEmail = await Member.findOne({ email: validatedData.email });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 },
      );
    }

    // Generate memberId here, before create(), so Mongoose validation
    // sees it immediately — the pre("save") hook runs async and can lose
    // the race against the required validator on Model.create().
    const count = await Member.countDocuments();
    const memberId = `MEM-${String(count + 1).padStart(5, "0")}`;

    const member = await Member.create({
      ...validatedData,
      memberId,
      savingsBalance: 0,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Member created successfully",
        member,
      },
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
