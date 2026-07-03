import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { authMiddleware } from "@/middleware/Authmiddleware";

// PATCH /api/notifications/[id] — mark a single notification read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    await connectDB();

    const notif = await Notification.findOneAndUpdate(
      { _id: id, recipient: auth.user!.userId },
      { $set: { read: true } },
      { new: true },
    );

    if (!notif)
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });

    return NextResponse.json({ success: true, notification: notif });
  } catch (err) {
    console.error("[PATCH /api/notifications/[id]]", err);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 },
    );
  }
}
