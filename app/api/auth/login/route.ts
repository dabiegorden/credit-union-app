// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Client from "@/models/Client";
import { generateToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const { email, password, portalType } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    await connectDB();

    // ── Client portal ────────────────────────────────────────────
    if (portalType === "client") {
      const client = await Client.findOne({
        email: email.toLowerCase().trim(),
      }).select("+password");

      if (!client) {
        console.log("[login] client not found for email:", email);
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 },
        );
      }

      if (!client.password) {
        console.error(
          "[login] client found but password field is missing — check select:false and .select('+password')",
        );
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 },
        );
      }

      const passwordMatch = await client.comparePassword(password);
      if (!passwordMatch) {
        console.log("[login] password mismatch for client:", email);
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 },
        );
      }

      if (client.status !== "active") {
        return NextResponse.json(
          { error: "Your account is not active. Please contact support." },
          { status: 403 },
        );
      }

      await Client.findByIdAndUpdate(client._id, { lastLogin: new Date() });

      const token = generateToken({
        userId: client._id.toString(),
        email: client.email,
        role: "client",
      });

      const res = NextResponse.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: client._id,
          name: `${client.firstName} ${client.lastName}`,
          email: client.email,
          role: "client",
        },
      });

      res.cookies.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
      });

      return res;
    }

    // ── Staff / Admin portal ─────────────────────────────────────
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");

    if (!user) {
      console.log("[login] user not found for email:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (!user.password) {
      console.error("[login] user found but password field missing");
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      console.log("[login] password mismatch for user:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const res = NextResponse.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
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
    console.error("[login] unexpected error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
