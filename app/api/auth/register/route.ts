import { NextResponse } from "next/server";

/**
 * Staff & admin self-registration is disabled. Staff accounts are created by
 * an administrator from the admin console; members self-register via
 * /api/auth/register-client.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Self-registration is only available to members. Staff accounts are created by an administrator.",
    },
    { status: 403 },
  );
}
