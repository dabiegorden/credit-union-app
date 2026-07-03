import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User, { STAFF_ROLES, StaffRole } from "@/models/User";

/**
 * POST /api/auth/register — self-registration for staff & admin consoles.
 * Accounts are created UNAPPROVED and cannot log in until an existing admin
 * authorises them. (Client members self-register via /api/auth/register-client.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role, staffRole } = body;

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 },
      );
    }
    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const requestedRole = role === "admin" ? "admin" : "staff";
    if (requestedRole === "staff" && !STAFF_ROLES.includes(staffRole as StaffRole)) {
      return NextResponse.json(
        { error: "Please select a valid staff position" },
        { status: 400 },
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 },
      );
    }

    // Self-registered staff/admin always start unapproved.
    const user = await User.create({
      name: name.trim(),
      email,
      password,
      role: requestedRole,
      staffRole: requestedRole === "staff" ? staffRole : undefined,
      isApproved: false,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Registration successful. Your account is pending admin approval before you can sign in.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          staffRole: user.staffRole,
          isApproved: user.isApproved,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
