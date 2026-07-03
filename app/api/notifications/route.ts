import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { authMiddleware } from "@/middleware/Authmiddleware";

function recipientModelFor(role: string): "Client" | "User" {
  return role === "client" ? "Client" : "User";
}

// GET /api/notifications — list current user's notifications
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30")));

    const query = {
      recipient: auth.user!.userId,
      recipientModel: recipientModelFor(auth.user!.role),
    };

    const [notifications, unread] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ ...query, read: false }),
    ]);

    return NextResponse.json({ success: true, notifications, unread });
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    await Notification.updateMany(
      {
        recipient: auth.user!.userId,
        recipientModel: recipientModelFor(auth.user!.role),
        read: false,
      },
      { $set: { read: true } },
    );

    return NextResponse.json({ success: true, message: "All notifications marked read" });
  } catch (err) {
    console.error("[PATCH /api/notifications]", err);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 },
    );
  }
}
