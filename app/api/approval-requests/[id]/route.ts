import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ApprovalRequest from "@/models/ApprovalRequest";
import Client from "@/models/Client";
import Loan from "@/models/Loan";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { z } from "zod";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reviewNote: z.string().optional(),
});

// PUT /api/approval-requests/[id] — admin approves or rejects a request.
// Approving a client_edit/client_delete request performs the underlying change.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin"]);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    await connectDB();

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }
    const { decision, reviewNote } = parsed.data;

    const reqDoc = await ApprovalRequest.findById(id);
    if (!reqDoc)
      return NextResponse.json(
        { error: "Approval request not found" },
        { status: 404 },
      );
    if (reqDoc.status !== "pending")
      return NextResponse.json(
        { error: "This request has already been reviewed" },
        { status: 409 },
      );

    if (decision === "reject") {
      reqDoc.status = "rejected";
      reqDoc.reviewedBy = auth.user!.userId as never;
      reqDoc.reviewNote = reviewNote;
      reqDoc.reviewedAt = new Date();
      await reqDoc.save();
      return NextResponse.json({
        success: true,
        message: "Request rejected",
        request: reqDoc,
      });
    }

    // decision === "approve" — perform the underlying action
    if (reqDoc.action === "client_edit") {
      if (!reqDoc.targetId)
        return NextResponse.json(
          { error: "Request is missing a target client" },
          { status: 400 },
        );

      const updates = (reqDoc.payload ?? {}) as Record<string, unknown>;

      if (updates.email) {
        const taken = await Client.findOne({
          email: updates.email,
          _id: { $ne: reqDoc.targetId },
        });
        if (taken)
          return NextResponse.json(
            { error: "Email already in use" },
            { status: 409 },
          );
      }

      const client = await Client.findByIdAndUpdate(
        reqDoc.targetId,
        { $set: updates },
        { new: true, runValidators: true },
      ).select("-password");

      if (!client)
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 },
        );
    } else if (reqDoc.action === "client_delete") {
      if (!reqDoc.targetId)
        return NextResponse.json(
          { error: "Request is missing a target client" },
          { status: 400 },
        );

      const [activeLoans, client] = await Promise.all([
        Loan.countDocuments({
          clientId: reqDoc.targetId,
          status: { $in: ["active", "overdue", "approved"] },
        }),
        Client.findById(reqDoc.targetId),
      ]);
      if (!client)
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 },
        );
      if (activeLoans > 0)
        return NextResponse.json(
          { error: "Cannot delete client with active loans" },
          { status: 409 },
        );
      if (client.savingsBalance > 0)
        return NextResponse.json(
          { error: "Cannot delete client with remaining balance" },
          { status: 409 },
        );

      await client.deleteOne();
    }
    // report_export simply gets marked approved; the export endpoint checks for it

    reqDoc.status = "approved";
    reqDoc.reviewedBy = auth.user!.userId as never;
    reqDoc.reviewNote = reviewNote;
    reqDoc.reviewedAt = new Date();
    await reqDoc.save();

    return NextResponse.json({
      success: true,
      message: "Request approved",
      request: reqDoc,
    });
  } catch (err) {
    console.error("[PUT /api/approval-requests/[id]]", err);
    return NextResponse.json(
      { error: "Failed to review approval request" },
      { status: 500 },
    );
  }
}
