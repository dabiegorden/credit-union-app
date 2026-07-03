/**
 * POST /api/clients/[id]/verify
 * Staff/Admin verify a self-registered member in person and activate their
 * portal access.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { notify } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    await connectDB();

    const client = await Client.findById(id);
    if (!client)
      return NextResponse.json({ error: "Client not found" }, { status: 404 });

    client.verificationStatus = "verified";
    client.status = "active";
    if (!client.openedBy) client.openedBy = auth.user!.userId as never;
    await client.save();

    await logActivity({
      staff: auth.user!.userId,
      action: "client_register",
      targetClient: client._id.toString(),
      targetLabel: `${client.firstName} ${client.lastName}`,
      description: "Verified & activated self-registered member",
    });

    await notify({
      recipient: client._id.toString(),
      recipientModel: "Client",
      type: "verification",
      title: "Your account has been verified",
      message:
        "Your identity has been verified and your account is now active. You can log in to the member portal.",
      email: client.email,
      emailName: `${client.firstName} ${client.lastName}`,
      sendEmail: true,
    });

    return NextResponse.json({
      success: true,
      message: "Client verified and activated",
    });
  } catch (err) {
    console.error("[POST /api/clients/[id]/verify]", err);
    return NextResponse.json({ error: "Failed to verify client" }, { status: 500 });
  }
}
