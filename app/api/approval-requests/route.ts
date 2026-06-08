import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ApprovalRequest from "@/models/ApprovalRequest";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { z } from "zod";

const createSchema = z.object({
  action: z.enum(["client_edit", "client_delete", "report_export"]),
  targetId: z.string().optional(),
  targetLabel: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().min(3, "Please provide a brief reason for this request"),
});

// GET /api/approval-requests — staff see their own requests, admin sees all
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const action = searchParams.get("action") || "";

    const query: Record<string, unknown> = {};
    if (auth.user?.role === "staff") query.requestedBy = auth.user.userId;
    if (status) query.status = status;
    if (action) query.action = action;

    const requests = await ApprovalRequest.find(query)
      .populate("requestedBy", "name email role")
      .populate("reviewedBy", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, requests });
  } catch (err) {
    console.error("[GET /api/approval-requests]", err);
    return NextResponse.json(
      { error: "Failed to fetch approval requests" },
      { status: 500 },
    );
  }
}

// POST /api/approval-requests — staff submits a request for admin approval
export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["staff"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { action, targetId, targetLabel, payload, reason } = parsed.data;

    const created = await ApprovalRequest.create({
      action,
      targetId: targetId || undefined,
      targetLabel,
      payload,
      reason,
      requestedBy: auth.user!.userId,
      status: "pending",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Approval request submitted to admin",
        request: created,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/approval-requests]", err);
    return NextResponse.json(
      { error: "Failed to submit approval request" },
      { status: 500 },
    );
  }
}
