import { NextResponse } from "next/server";

export function successResponse(
  data: unknown,
  message = "Success",
  status = 200,
) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function errorResponse(
  message: string,
  status = 400,
  errors?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      message,
      errors,
    },
    { status },
  );
}

export function paginatedResponse(
  data: unknown[],
  total: number,
  page: number,
  limit: number,
  message = "Success",
) {
  return NextResponse.json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  });
}

export function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)),
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
