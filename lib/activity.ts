// lib/activity.ts
// Helpers for recording staff activity and mutating the credit union's
// pooled general account.
import ActivityLog, { ActivityAction } from "@/models/ActivityLog";
import GeneralAccount from "@/models/GeneralAccount";

interface LogActivityOptions {
  staff: string;
  action: ActivityAction;
  amount?: number;
  targetClient?: string;
  targetLabel?: string;
  description?: string;
}

/**
 * Record a staff activity log entry. Never throws — logging must not break the
 * primary operation.
 */
export async function logActivity(opts: LogActivityOptions): Promise<void> {
  try {
    await ActivityLog.create({
      staff: opts.staff,
      action: opts.action,
      amount: opts.amount,
      targetClient: opts.targetClient,
      targetLabel: opts.targetLabel,
      description: opts.description,
    });
  } catch (err) {
    console.error("[activity] failed to log activity:", err);
  }
}

/**
 * Apply a deposit/withdrawal to the credit union's pooled general account.
 * Uses an atomic upsert so the singleton is created on first use.
 */
export async function applyToGeneralAccount(
  transactionType: "deposit" | "withdrawal",
  amount: number,
): Promise<number> {
  const isDeposit = transactionType === "deposit";
  const doc = await GeneralAccount.findOneAndUpdate(
    { key: "MAIN" },
    {
      $inc: {
        balance: isDeposit ? amount : -amount,
        totalDeposits: isDeposit ? amount : 0,
        totalWithdrawals: isDeposit ? 0 : amount,
      },
      $setOnInsert: { key: "MAIN" },
    },
    { new: true, upsert: true },
  );
  return doc.balance;
}
