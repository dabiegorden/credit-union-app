/**
 * lib/loanEligibility.ts
 *
 * Pure utility — evaluates a member's loan eligibility score (0-100)
 * and returns a qualification verdict + recommended interest rate.
 *
 * Scoring breakdown:
 *   Savings balance vs requested amount  — 30 pts
 *   Transaction activity (6 months)      — 20 pts
 *   Repayment history (past loans)       — 30 pts
 *   Membership duration                  — 10 pts
 *   Active savings accounts              — 10 pts
 *
 * Score thresholds:
 *   ≥ 70  → Eligible    (creditHistory: good)
 *   50-69 → Conditional (creditHistory: fair)
 *   30-49 → Risky       (creditHistory: poor)
 *   < 30  → Ineligible  (creditHistory: poor)
 */

export type CreditHistory = "good" | "fair" | "poor" | "no_history";

export interface EligibilityInput {
  // Member
  memberJoinDate: Date;
  savingsBalance: number; // total savings balance across all accounts
  activeAccountCount: number;

  // Requested loan
  requestedAmount: number;

  // Transaction activity (last 6 months from savings transactions)
  totalDeposits6Months: number;
  depositCount6Months: number;

  // Past loan repayment history
  completedLoans: number; // fully paid loans
  defaultedLoans: number; // loans that went overdue / never paid
  activeLoans: number; // current active/approved loans
  pendingLoans: number; // pending applications
}

export interface EligibilityResult {
  score: number; // 0–100
  creditHistory: CreditHistory;
  eligible: boolean; // score >= 50
  maxRecommendedAmount: number; // based on savings balance & score
  interestRate: number; // annual % — lower score = higher rate
  breakdown: {
    savingsScore: number;
    activityScore: number;
    repaymentScore: number;
    membershipScore: number;
    accountScore: number;
  };
  flags: string[]; // human-readable flags / warnings
}

/** Months between two dates */
function monthsSince(date: Date): number {
  const now = new Date();
  return (
    (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth())
  );
}

export function calculateEligibility(
  input: EligibilityInput,
): EligibilityResult {
  const flags: string[] = [];
  let savingsScore = 0;
  let activityScore = 0;
  let repaymentScore = 0;
  let membershipScore = 0;
  let accountScore = 0;

  /* ── 1. Savings balance vs requested amount (30 pts) ─────────────────── */
  const ratio = input.savingsBalance / Math.max(input.requestedAmount, 1);
  if (ratio >= 1.0) {
    savingsScore = 30; // balance covers full loan
  } else if (ratio >= 0.5) {
    savingsScore = 20;
  } else if (ratio >= 0.25) {
    savingsScore = 12;
    flags.push("Savings balance is less than 25% of requested amount");
  } else {
    savingsScore = 4;
    flags.push("Savings balance is very low relative to requested amount");
  }

  /* ── 2. Transaction activity — last 6 months (20 pts) ───────────────── */
  if (input.depositCount6Months >= 12) {
    activityScore = 20; // 2+ deposits/month
  } else if (input.depositCount6Months >= 6) {
    activityScore = 14;
  } else if (input.depositCount6Months >= 2) {
    activityScore = 8;
    flags.push("Low transaction activity in the past 6 months");
  } else {
    activityScore = 0;
    flags.push("No/minimal transaction activity in the past 6 months");
  }

  // Bonus: consistent deposit volume
  if (input.totalDeposits6Months >= input.requestedAmount * 0.5) {
    activityScore = Math.min(20, activityScore + 4);
  }

  /* ── 3. Repayment history (30 pts) ──────────────────────────────────── */
  const totalPastLoans = input.completedLoans + input.defaultedLoans;
  if (totalPastLoans === 0) {
    repaymentScore = 15; // no history — neutral
    flags.push("No previous loan history");
  } else {
    const repaymentRate = input.completedLoans / totalPastLoans;
    if (repaymentRate === 1.0) {
      repaymentScore = 30;
    } else if (repaymentRate >= 0.8) {
      repaymentScore = 22;
    } else if (repaymentRate >= 0.5) {
      repaymentScore = 12;
      flags.push("Some loan defaults on record");
    } else {
      repaymentScore = 3;
      flags.push("Poor repayment history — multiple defaults");
    }
  }

  // Penalise for too many active/pending loans
  if (input.activeLoans >= 2) {
    repaymentScore = Math.max(0, repaymentScore - 10);
    flags.push("Already has 2 or more active loans");
  } else if (input.activeLoans === 1) {
    repaymentScore = Math.max(0, repaymentScore - 5);
    flags.push("Already has an active loan");
  }
  if (input.pendingLoans >= 1) {
    flags.push("Has a pending loan application");
  }

  /* ── 4. Membership duration (10 pts) ─────────────────────────────────── */
  const months = monthsSince(input.memberJoinDate);
  if (months >= 24) {
    membershipScore = 10;
  } else if (months >= 12) {
    membershipScore = 7;
  } else if (months >= 6) {
    membershipScore = 4;
    flags.push("Membership is less than 12 months old");
  } else {
    membershipScore = 1;
    flags.push("Membership is less than 6 months old");
  }

  /* ── 5. Active savings accounts (10 pts) ─────────────────────────────── */
  if (input.activeAccountCount >= 2) {
    accountScore = 10;
  } else if (input.activeAccountCount === 1) {
    accountScore = 6;
  } else {
    accountScore = 0;
    flags.push("No active savings account");
  }

  /* ── Final score ─────────────────────────────────────────────────────── */
  const score = Math.min(
    100,
    savingsScore +
      activityScore +
      repaymentScore +
      membershipScore +
      accountScore,
  );

  /* ── Credit history label ─────────────────────────────────────────────── */
  let creditHistory: CreditHistory;
  if (totalPastLoans === 0) {
    creditHistory = "no_history";
  } else if (score >= 70) {
    creditHistory = "good";
  } else if (score >= 50) {
    creditHistory = "fair";
  } else {
    creditHistory = "poor";
  }

  /* ── Max recommended amount (savings-based) ──────────────────────────── */
  let multiplier = 1;
  if (score >= 80) multiplier = 3;
  else if (score >= 70) multiplier = 2.5;
  else if (score >= 60) multiplier = 2;
  else if (score >= 50) multiplier = 1.5;
  const maxRecommendedAmount = Math.floor(input.savingsBalance * multiplier);

  /* ── Interest rate (inverse of score) ───────────────────────────────── */
  let interestRate: number;
  if (score >= 80) interestRate = 15;
  else if (score >= 70) interestRate = 18;
  else if (score >= 60) interestRate = 22;
  else if (score >= 50) interestRate = 26;
  else interestRate = 30;

  return {
    score,
    creditHistory,
    eligible: score >= 50,
    maxRecommendedAmount,
    interestRate,
    breakdown: {
      savingsScore,
      activityScore,
      repaymentScore,
      membershipScore,
      accountScore,
    },
    flags,
  };
}

/**
 * Calculate monthly repayment using flat interest method (simple interest)
 * which is common in credit unions / microfinance.
 *
 * totalInterest = principal × (rate/100) × (months/12)
 * monthlyRepayment = (principal + totalInterest) / months
 */
export function calcRepaymentSchedule(
  principal: number,
  annualRatePct: number,
  months: number,
): { monthlyRepayment: number; totalInterest: number; totalPayable: number } {
  const totalInterest = principal * (annualRatePct / 100) * (months / 12);
  const totalPayable = principal + totalInterest;
  const monthlyRepayment = totalPayable / months;
  return {
    monthlyRepayment: Math.round(monthlyRepayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
  };
}

/**
 * Daily penalty rate — applied when nextPaymentDate is missed.
 * Default: 2% of outstanding balance per month = ~0.0667% per day.
 */
export const DAILY_PENALTY_RATE = 0.02 / 30;
