import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";
import { authMiddleware } from "@/middleware/Authmiddleware";

type Period = "day" | "week" | "month" | "year" | "all";

function rangeStart(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case "day":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week": {
      const d = new Date(now);
      d.setDate(now.getDate() - 7);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}

// GET /api/activity-logs?period=day|week|month|year&staff=&action=
// Admin sees all staff activity; staff see only their own.
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request, ["admin", "staff"]);
    if (!auth.isValid) return auth.response!;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "all") as Period;
    const staffFilter = searchParams.get("staff") || "";
    const action = searchParams.get("action") || "";
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "100")));

    const query: Record<string, unknown> = {};

    // Staff can only see their own activity
    if (auth.user?.role === "staff") {
      query.staff = auth.user.userId;
    } else if (staffFilter) {
      query.staff = staffFilter;
    }

    if (action) query.action = action;

    const start = rangeStart(period);
    if (start) query.createdAt = { $gte: start };

    const [logs, summaryAgg] = await Promise.all([
      ActivityLog.find(query)
        .populate("staff", "name email role staffRole")
        .populate("targetClient", "clientId firstName lastName")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      ActivityLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
            total: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
      ]),
    ]);

    const summary = summaryAgg.reduce(
      (acc: Record<string, { count: number; total: number }>, s) => {
        acc[s._id] = { count: s.count, total: s.total };
        return acc;
      },
      {},
    );

    return NextResponse.json({ success: true, logs, summary, period });
  } catch (err) {
    console.error("[GET /api/activity-logs]", err);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 },
    );
  }
}
