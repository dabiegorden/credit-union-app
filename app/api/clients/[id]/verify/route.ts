/**
 * POST /api/clients/[id]/verify
 * Staff/Admin review a self-registered member.
 * Body: { decision: "approve" | "decline", reason?: string }
 *  - approve → verify identity and activate portal access
 *  - decline → mark rejected, keep account inactive, notify with reason
 * (Defaults to "approve" when no decision is supplied.)
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { notify } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const schema = z.object({
  decision: z.enum(["approve", "decline"]).default("approve"),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    await connectDB();

    // Body is optional — tolerate empty/invalid JSON and default to approve.
    let decision: "approve" | "decline" = "approve";
    let reason: string | undefined;
    try {
      const parsed = schema.safeParse(await request.json());
      if (parsed.success) {
        decision = parsed.data.decision;
        reason = parsed.data.reason;
      }
    } catch {
      /* no body — default approve */
    }

    const client = await Client.findById(id);
    if (!client)
      return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const fullName = `${client.firstName} ${client.lastName}`;

    if (decision === "decline") {
      client.verificationStatus = "rejected";
      client.status = "inactive";
      await client.save();

      await logActivity({
        staff: auth.user!.userId,
        action: "client_register",
        targetClient: client._id.toString(),
        targetLabel: fullName,
        description: `Declined self-registration${reason ? `: ${reason}` : ""}`,
      });

      await notify({
        recipient: client._id.toString(),
        recipientModel: "Client",
        type: "verification",
        title: "Your registration could not be approved",
        message:
          `We were unable to approve your registration at this time.` +
          (reason ? ` Reason: ${reason}.` : "") +
          ` Please visit any First Choice Credit Union branch with a valid Ghana card to complete your registration, or contact our support team for assistance.`,
        email: client.email,
        emailName: fullName,
        sendEmail: true,
        meta: { reason },
      });

      return NextResponse.json({
        success: true,
        message: "Registration declined",
      });
    }

    // ── approve ──────────────────────────────────────────────────────────
    client.verificationStatus = "verified";
    client.status = "active";
    if (!client.openedBy) client.openedBy = auth.user!.userId as never;
    await client.save();

    await logActivity({
      staff: auth.user!.userId,
      action: "client_register",
      targetClient: client._id.toString(),
      targetLabel: fullName,
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
      emailName: fullName,
      sendEmail: true,
    });

    return NextResponse.json({
      success: true,
      message: "Client verified and activated",
    });
  } catch (err) {
    console.error("[POST /api/clients/[id]/verify]", err);
    return NextResponse.json(
      { error: "Failed to review client" },
      { status: 500 },
    );
  }
}
