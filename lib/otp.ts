// lib/otp.ts
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// ---------------------------------------------------------------------------
// We store OTPs in a lightweight MongoDB collection so they work across
// serverless cold starts without Redis.
// ---------------------------------------------------------------------------

interface IOtpDoc {
  userId: string;
  hash: string; // bcrypt-style: we SHA-256 the OTP so the raw value isn't stored
  expiresAt: Date;
  attempts: number;
}

const OtpSchema = new mongoose.Schema<IOtpDoc>({
  userId: { type: String, required: true, index: true },
  hash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
});

// TTL index — MongoDB auto-deletes docs after expiresAt
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpModel: mongoose.Model<IOtpDoc> =
  mongoose.models.Otp || mongoose.model<IOtpDoc>("Otp", OtpSchema);

// ---------------------------------------------------------------------------

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function generateAndStoreOtp(userId: string): Promise<string> {
  await connectDB();

  // 6-digit numeric OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));

  // Remove any existing OTP for this user (one active OTP at a time)
  await OtpModel.deleteMany({ userId });

  await OtpModel.create({
    userId,
    hash: hashOtp(otp),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    attempts: 0,
  });

  return otp;
}

/**
 * Returns true and deletes the OTP record on success.
 * Returns false if not found, expired, or the code doesn't match.
 * Locks out after 5 failed attempts.
 */
export async function verifyAndConsumeOtp(
  userId: string,
  otp: string,
): Promise<boolean> {
  await connectDB();

  const record = await OtpModel.findOne({ userId });

  if (!record) return false;

  // Expired check (belt-and-suspenders on top of TTL index)
  if (record.expiresAt < new Date()) {
    await OtpModel.deleteOne({ _id: record._id });
    return false;
  }

  // Too many attempts
  if (record.attempts >= 5) {
    await OtpModel.deleteOne({ _id: record._id });
    return false;
  }

  const matches = hashOtp(otp) === record.hash;

  if (!matches) {
    await OtpModel.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    return false;
  }

  // Valid — consume it
  await OtpModel.deleteOne({ _id: record._id });
  return true;
}
