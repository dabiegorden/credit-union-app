/**
 * POST /api/auth/register-client
 * Public client self-registration. Creates a Client with a pending
 * verification status — the member must visit the office to be verified
 * before their portal is activated.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { notify } from "@/lib/notify";
import { GHANA_CARD_REGEX } from "@/lib/validators";
import { z } from "zod";

const schema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  address: z.string().min(5, "Address is required"),
  nationalId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GHANA_CARD_REGEX, "Invalid Ghana card number. Format: GHA-726017025-4"),
  dateOfBirth: z.string().optional(),
  occupation: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  ghanaCardFront: z.string().min(1, "Ghana card image is required"),
  ghanaCardBack: z.string().optional(),
  signature: z.string().min(1, "Signature is required"),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const [emailTaken, idTaken] = await Promise.all([
      Client.findOne({ email: data.email.toLowerCase() }),
      Client.findOne({ nationalId: data.nationalId }),
    ]);
    if (emailTaken)
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    if (idTaken)
      return NextResponse.json(
        { error: "Ghana card already registered" },
        { status: 409 },
      );

    const client = await Client.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      nationalId: data.nationalId,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      occupation: data.occupation,
      password: data.password,
      ghanaCardFront: data.ghanaCardFront,
      ghanaCardBack: data.ghanaCardBack,
      signature: data.signature,
      selfRegistered: true,
      verificationStatus: "pending",
      // Inactive until an officer verifies the member in person
      status: "inactive",
    });

    // Notify the client to come to the office for verification
    await notify({
      recipient: client._id.toString(),
      recipientModel: "Client",
      type: "verification",
      title: "Please come to the office for verification",
      message:
        "Thank you for registering with First Choice Credit Union. Your account has been created but is not yet active. Please visit our office with your Ghana card so a staff member can verify your identity and activate your account.",
      email: client.email,
      emailName: `${client.firstName} ${client.lastName}`,
      sendEmail: true,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Registration submitted. Please come to the office for verification.",
        clientId: client.clientId,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/auth/register-client]", err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 },
    );
  }
}
