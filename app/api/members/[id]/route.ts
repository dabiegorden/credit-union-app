import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import { z } from "zod";
import { authMiddleware } from "@/middleware/Authmiddleware";

const updateMemberSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional(),
  address: z.string().min(5).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  photo: z.string().optional(),
});

// GET - Get single member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;

    await connectDB();

    const member = await Member.findById(id).select("-userId");
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Members can only view their own record
    if (auth.user?.role === "member") {
      const memberOwned = await Member.findOne({ userId: auth.user.userId });
      if (!memberOwned || memberOwned._id.toString() !== id) {
        return NextResponse.json(
          { error: "Forbidden - Cannot view other members" },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({ member }, { status: 200 });
  } catch (error) {
    console.error("Get member error:", error);
    return NextResponse.json(
      { error: "Failed to fetch member" },
      { status: 500 },
    );
  }
}

// PUT - Update member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);

    await connectDB();

    const member = await Member.findByIdAndUpdate(
      id,
      { $set: validatedData },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Member updated successfully",
        member,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    console.error("Update member error:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 },
    );
  }
}

// DELETE - Delete member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin"]);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;

    await connectDB();

    const member = await Member.findByIdAndDelete(id);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Member deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete member error:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 },
    );
  }
}
