import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import SavingsAccount from "@/models/Savingsaccount";
import Loan from "@/models/Loan";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { z } from "zod";

const updateSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional(),
  address: z.string().min(5).optional(),
  occupation: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  photo: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff", "client"]);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    await connectDB();

    // Clients can only view their own record
    if (auth.user?.role === "client" && auth.user.userId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await Client.findById(id)
      .select("-password")
      .populate("openedBy", "name role")
      .lean();
    if (!client)
      return NextResponse.json({ error: "Client not found" }, { status: 404 });

    // Summary counts
    const [accounts, activeLoans, pendingLoans] = await Promise.all([
      SavingsAccount.find({ clientId: id })
        .select("accountNumber accountType balance status")
        .lean(),
      Loan.countDocuments({
        clientId: id,
        status: { $in: ["active", "overdue"] },
      }),
      Loan.countDocuments({
        clientId: id,
        status: { $in: ["pending", "under_review", "approved"] },
      }),
    ]);

    return NextResponse.json({
      success: true,
      client,
      accounts,
      loanSummary: { activeLoans, pendingLoans },
    });
  } catch (err) {
    console.error("[GET /api/clients/[id]]", err);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 },
    );
  }
}

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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    // Prevent email duplication
    if (parsed.data.email) {
      const taken = await Client.findOne({
        email: parsed.data.email,
        _id: { $ne: id },
      });
      if (taken)
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 },
        );
    }

    const client = await Client.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true },
    ).select("-password");

    if (!client)
      return NextResponse.json({ error: "Client not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      message: "Client updated",
      client,
    });
  } catch (err) {
    console.error("[PUT /api/clients/[id]]", err);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authMiddleware(request, ["admin"]);
    if (!auth.isValid) return auth.response!;

    const { id } = await params;
    await connectDB();

    // Safety: don't delete if active loans or positive balance
    const [activeLoans, client] = await Promise.all([
      Loan.countDocuments({
        clientId: id,
        status: { $in: ["active", "overdue", "approved"] },
      }),
      Client.findById(id),
    ]);
    if (!client)
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
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
    return NextResponse.json({ success: true, message: "Client deleted" });
  } catch (err) {
    console.error("[DELETE /api/clients/[id]]", err);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 },
    );
  }
}
