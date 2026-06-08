// lib/mailer.ts
import { Resend } from "resend";
import OtpEmailTemplate from "@/components/emails/OtpEmailTemplate";
import WelcomeEmailTemplate from "@/components/emails/WelcomeEmailTemplate";
const resend = new Resend(process.env.RESEND_API_KEY);

interface SendOtpEmailOptions {
  to: string;
  name: string;
  otp: string;
  portalType: "client" | "staff" | "admin";
}

interface SendWelcomeEmailOptions {
  to: string;
  name: string;
  email: string;
  password: string;
  portalType: "client" | "staff" | "admin";
  pendingApproval: boolean;
}

export async function sendOtpEmail({
  to,
  name,
  otp,
  portalType,
}: SendOtpEmailOptions): Promise<void> {
  const { error } = await resend.emails.send({
    // Replace with your verified sending domain once set up in Resend
    from:
      process.env.RESEND_FROM_EMAIL ??
      "First Choice Credit Union <markowusu@newhopewellnesshub.org>",
    to: [to],
    subject: `Your First Choice CU Sign-In Code: ${otp}`,
    react: OtpEmailTemplate({ name, otp, portalType }),
  });

  if (error) {
    console.error("[mailer] Resend error:", error);
    throw new Error("Failed to send OTP email.");
  }
}

export async function sendWelcomeEmail({
  to,
  name,
  email,
  password,
  portalType,
  pendingApproval,
}: SendWelcomeEmailOptions): Promise<void> {
  const { error } = await resend.emails.send({
    from:
      process.env.RESEND_FROM_EMAIL ??
      "First Choice Credit Union <markowusu@newhopewellnesshub.org>",
    to: [to],
    subject: "Your First Choice CU Account Has Been Created",
    react: WelcomeEmailTemplate({ name, email, password, portalType, pendingApproval }),
  });

  if (error) {
    console.error("[mailer] Resend error:", error);
    throw new Error("Failed to send welcome email.");
  }
}
