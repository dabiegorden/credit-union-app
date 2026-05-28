export type Role = "admin" | "staff" | "client";

export type LoanStatus = "pending" | "approved" | "rejected" | "paid";

export type TransactionType = "deposit" | "withdrawal";

export type ClientStatus = "active" | "inactive" | "suspended";

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}
