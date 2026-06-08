// app/api/auth/resend-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Client from "@/models/Client";
import { verifyPendingToken } from "@/lib/jwt";
import { generateAndStoreOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/mailer";

export async function POST(request: NextRequest) {
  try {
    const { pendingToken } = await request.json();

    if (!pendingToken) {
      return NextResponse.json(
        { error: "Session token is required." },
        { status: 400 },
      );
    }

    const pending = verifyPendingToken(pendingToken);
    if (!pending) {
      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 },
      );
    }

    await connectDB();

    let name = "";
    let email = pending.email;

    if (pending.role === "client") {
      const client = await Client.findById(pending.userId);
      if (!client) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      name = `${client.firstName} ${client.lastName}`;
    } else {
      const user = await User.findById(pending.userId);
      if (!user) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      name = user.name;
    }

    const otp = await generateAndStoreOtp(pending.userId);
    await sendOtpEmail({
      to: email,
      name,
      otp,
      portalType: pending.role as "client" | "staff" | "admin",
    });

    return NextResponse.json({
      success: true,
      message: "A new OTP has been sent to your email.",
    });
  } catch (error) {
    console.error("[resend-otp] error:", error);
    return NextResponse.json(
      { error: "Could not resend OTP." },
      { status: 500 },
    );
  }
}
