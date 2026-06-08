// app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { verifyPendingToken, generateToken } from "@/lib/jwt";
import { verifyAndConsumeOtp } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const { otp, pendingToken } = await request.json();

    if (!otp || !pendingToken) {
      return NextResponse.json(
        { error: "OTP and session token are required." },
        { status: 400 },
      );
    }

    // 1. Validate the pending token
    const pending = verifyPendingToken(pendingToken);
    if (!pending) {
      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 },
      );
    }

    await connectDB();

    // 2. Verify the OTP
    const otpValid = await verifyAndConsumeOtp(pending.userId, otp.trim());
    if (!otpValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP. Please try again." },
        { status: 401 },
      );
    }

    // 3. Update lastLogin for clients
    if (pending.role === "client") {
      await Client.findByIdAndUpdate(pending.userId, { lastLogin: new Date() });
    }

    // 4. Issue the real JWT
    const token = generateToken({
      userId: pending.userId,
      email: pending.email,
      role: pending.role,
    });

    const res = NextResponse.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: pending.userId,
        email: pending.email,
        role: pending.role,
      },
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (error) {
    console.error("[verify-otp] error:", error);
    return NextResponse.json(
      { error: "Verification failed." },
      { status: 500 },
    );
  }
}
