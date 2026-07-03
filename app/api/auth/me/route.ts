import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Client from "@/models/Client";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      email: string;
      role: string;
    };

    // Client portal token — look up in Client collection
    if (decoded.role === "client") {
      const client = await Client.findById(decoded.userId)
        .select("-password")
        .lean();
      if (!client) {
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({
        success: true,
        role: "client",
        user: {
          id: (client as any)._id,
          name: `${(client as any).firstName} ${(client as any).lastName}`,
          email: (client as any).email,
        },
      });
    }

    // Staff / Admin token — look up in User collection
    const user = await User.findById(decoded.userId).select("-password").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      role: (user as any).role,
      user: {
        id: (user as any)._id,
        name: (user as any).name,
        email: (user as any).email,
        staffRole: (user as any).staffRole ?? null,
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
