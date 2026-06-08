/**
 * GET  /api/clients  — list all clients (admin/staff)
 * POST /api/clients  — register a new client (admin/staff)
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { authMiddleware } from "@/middleware/Authmiddleware";
import { sendWelcomeEmail } from "@/lib/mailer";
import { z } from "zod";

const createClientSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().min(5),
  nationalId: z.string().min(5),
  dateOfBirth: z.string().optional(),
  occupation: z.string().optional(),
  // Temporary password — client should change on first login
  password: z.string().min(6, "Initial password must be at least 6 characters"),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20")),
    );

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { clientId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { nationalId: { $regex: search, $options: "i" } },
      ];
    }

    const [total, clients] = await Promise.all([
      Client.countDocuments(query),
      Client.find(query)
        .select("-password")
        .populate("openedBy", "name role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      clients,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[GET /api/clients]", err);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const body = await request.json();
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Uniqueness checks
    const [emailTaken, idTaken] = await Promise.all([
      Client.findOne({ email: data.email }),
      Client.findOne({ nationalId: data.nationalId }),
    ]);
    if (emailTaken)
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    if (idTaken)
      return NextResponse.json(
        { error: "National ID already registered" },
        { status: 409 },
      );

    const client = await Client.create({
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      openedBy: auth.user!.userId,
      // New clients are inactive until an admin authorizes portal access
      status: "inactive",
    });

    try {
      await sendWelcomeEmail({
        to: client.email,
        name: `${client.firstName} ${client.lastName}`,
        email: client.email,
        password: data.password,
        portalType: "client",
        pendingApproval: true,
      });
    } catch (emailErr) {
      console.error("[POST /api/clients] welcome email failed:", emailErr);
    }

    const clientObj = client.toObject();
    delete (clientObj as any).password;

    return NextResponse.json(
      {
        success: true,
        message: "Client registered successfully",
        client: clientObj,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/clients]", err);
    return NextResponse.json(
      { error: "Failed to register client" },
      { status: 500 },
    );
  }
}
