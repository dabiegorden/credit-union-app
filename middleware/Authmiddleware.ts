import { NextRequest, NextResponse } from "next/server";
import { verifyToken, JWTPayload } from "@/lib/jwt";

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export async function authMiddleware(
  request: NextRequest,
  requiredRole?: string[],
): Promise<{ isValid: boolean; user?: JWTPayload; response?: NextResponse }> {
  try {
    const token =
      request.cookies.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return {
        isValid: false,
        response: NextResponse.json(
          { error: "Unauthorized - No token provided" },
          { status: 401 },
        ),
      };
    }

    const user = verifyToken(token);

    if (!user) {
      return {
        isValid: false,
        response: NextResponse.json(
          { error: "Unauthorized - Invalid token" },
          { status: 401 },
        ),
      };
    }

    if (requiredRole && !requiredRole.includes(user.role)) {
      return {
        isValid: false,
        response: NextResponse.json(
          { error: "Forbidden - Insufficient permissions" },
          { status: 403 },
        ),
      };
    }

    return { isValid: true, user };
  } catch (error) {
    console.error("Auth middleware error:", error);
    return {
      isValid: false,
      response: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      ),
    };
  }
}
