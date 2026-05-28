/**
 * FIXED: src/app/api/savings/accounts/route.ts
 *
 * KEY FIX: Uses email-fallback client resolution for the client GET path.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { z } from "zod";
import Savingsaccount from "@/models/Savingsaccount";
import mongoose from "mongoose";
import Client from "@/models/Client";

const createAccountSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  accountType: z.enum(["regular", "fixed", "susu"]).default("regular"),
  accountName: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

// ─── GET /api/savings/accounts ────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";

    // Clients can only see their own accounts
    // Replace the GET client block:
    if (auth.user?.role === "client") {
      // JWT userId IS the Client._id — no lookup needed
      const accounts = await Savingsaccount.find({ clientId: auth.user.userId })
        .sort({ createdAt: -1 })
        .lean();
      return NextResponse.json({ success: true, accounts });
    }

    // Admin / Staff — full list with filters
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (type) query.accountType = type;

    if (search) {
      const matchingClients = await Client.find({
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { clientId: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const clientIds = matchingClients.map((m) => m._id);

      query.$or = [
        { accountNumber: { $regex: search, $options: "i" } },
        { clientId: { $in: clientIds } },
      ];
    }

    const [total, accounts] = await Promise.all([
      Savingsaccount.countDocuments(query),
      Savingsaccount.find(query)
        .populate("clientId", "clientId firstName lastName email phone status")
        .populate("openedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      accounts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/savings/accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 },
    );
  }
}

// ─── POST /api/savings/accounts ───────────────────────────────────────────────
// Admin / Staff only — open a new savings account for a client
export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const body = await request.json();
    const parsed = createAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { clientId, accountType, accountName, description } = parsed.data;

    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (client.status !== "active") {
      return NextResponse.json(
        { error: "Cannot open account for an inactive or suspended client" },
        { status: 400 },
      );
    }

    const duplicate = await Savingsaccount.findOne({
      clientId: clientId,
      accountType,
      status: { $ne: "closed" },
    });
    if (duplicate) {
      return NextResponse.json(
        {
          error: `Client already has an active ${accountType} savings account`,
        },
        { status: 409 },
      );
    }

    const defaultName =
      accountType === "regular"
        ? "Regular Savings"
        : accountType === "fixed"
          ? "Fixed Deposit"
          : "Susu Savings";

    const account = await Savingsaccount.create({
      clientId: clientId,
      accountType,
      accountName: accountName || defaultName,
      openedBy: auth.user?.userId,
      description,
    });

    await account.populate("clientId", "clientId firstName lastName email");
    await account.populate("openedBy", "name email role");

    return NextResponse.json(
      {
        success: true,
        message: "Savings account opened successfully",
        account,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/savings/accounts:", error);
    return NextResponse.json(
      { error: "Failed to create savings account" },
      { status: 500 },
    );
  }
}
