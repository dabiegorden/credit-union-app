import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      email: string;
      role: string;
    };

    // Fetch user
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return data based on role
    if (user.role === "admin") {
      return NextResponse.json({
        success: true,
        role: "admin",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    }

    if (user.role === "staff") {
      return NextResponse.json({
        success: true,
        role: "staff",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    }

    // Default → member
    return NextResponse.json({
      success: true,
      role: "member",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Auth error:", error);

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 },
    );
  }
}
