// lib/jwt.ts
// @ts-ignore
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
// Separate secret for pending (pre-OTP) tokens keeps them clearly scoped.
// Falls back to JWT_SECRET if not set.
const PENDING_SECRET =
  process.env.JWT_PENDING_SECRET ?? JWT_SECRET + "_pending";

export interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "staff" | "client";
}

export interface PendingJWTPayload extends JWTPayload {
  pending: true;
}

// ── Full session token (issued after OTP verification) ───────────────────────

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

// ── Short-lived pending token (issued after password check, before OTP) ──────

export function generatePendingToken(payload: JWTPayload): string {
  return jwt.sign({ ...payload, pending: true }, PENDING_SECRET, {
    expiresIn: "15m", // Must complete OTP within 15 minutes
  });
}

export function verifyPendingToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, PENDING_SECRET) as PendingJWTPayload;
    if (!decoded.pending) return null;
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}
