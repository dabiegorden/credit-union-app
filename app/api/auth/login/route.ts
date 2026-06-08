// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Client from "@/models/Client";
import { generatePendingToken } from "@/lib/jwt";
import { generateAndStoreOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/mailer";

function invalidCredentials() {
  return NextResponse.json(
    { error: "Invalid email or password" },
    { status: 401 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    await connectDB();

    const normalizedEmail = email.toLowerCase().trim();

    // Look up the account by email regardless of which portal tab was
    // selected — the selected tab is just a UI convenience and shouldn't
    // block a valid login (e.g. a staff member left on the default
    // "Client" tab would otherwise see a confusing "invalid credentials").
    const [client, user] = await Promise.all([
      Client.findOne({ email: normalizedEmail }).select("+password"),
      User.findOne({ email: normalizedEmail }).select("+password"),
    ]);

    // ── Client account ───────────────────────────────────────────
    if (client?.password) {
      const passwordMatch = await client.comparePassword(password);
      if (passwordMatch) {
        if (client.status !== "active") {
          return NextResponse.json(
            { error: "Your account is not active. Please contact support." },
            { status: 403 },
          );
        }

        const otp = await generateAndStoreOtp(client._id.toString());
        await sendOtpEmail({
          to: client.email,
          name: `${client.firstName} ${client.lastName}`,
          otp,
          portalType: "client",
        });

        const pendingToken = generatePendingToken({
          userId: client._id.toString(),
          email: client.email,
          role: "client",
        });

        return NextResponse.json({
          success: true,
          requiresOtp: true,
          pendingToken,
          message: "OTP sent to your email address.",
        });
      }
    }

    // ── Staff / Admin account ────────────────────────────────────
    if (user?.password) {
      const passwordMatch = await user.comparePassword(password);
      if (passwordMatch) {
        if (!user.isApproved) {
          return NextResponse.json(
            {
              error:
                "Your account is pending admin approval. Please wait until an administrator authorizes access.",
            },
            { status: 403 },
          );
        }

        const otp = await generateAndStoreOtp(user._id.toString());
        await sendOtpEmail({
          to: user.email,
          name: user.name,
          otp,
          portalType: user.role as "staff" | "admin",
        });

        const pendingToken = generatePendingToken({
          userId: user._id.toString(),
          email: user.email,
          role: user.role,
        });

        return NextResponse.json({
          success: true,
          requiresOtp: true,
          pendingToken,
          message: "OTP sent to your email address.",
        });
      }
    }

    // No matching account/password in either collection
    return invalidCredentials();
  } catch (error) {
    console.error("[login] unexpected error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
