export type CreditHistory = "good" | "fair" | "poor" | "no_history";

export interface EligibilityInput {
  clientJoinDate: Date;
  savingsBalance: number;
  activeAccountCount: number;
  requestedAmount: number;
  totalDeposits6Months: number;
  depositCount6Months: number;
  completedLoans: number;
  defaultedLoans: number;
  activeLoans: number;
  pendingLoans: number;
}

export interface EligibilityResult {
  score: number;
  creditHistory: CreditHistory;
  eligible: boolean;
  maxRecommendedAmount: number;
  baseInterestRate: number; // system-suggested base rate
  amountSurcharge: number; // added because of loan size
  suggestedInterestRate: number; // base + surcharge (staff can still override)
  breakdown: {
    savingsScore: number;
    activityScore: number;
    repaymentScore: number;
    membershipScore: number;
    accountScore: number;
  };
  flags: string[];
}

function monthsSince(date: Date): number {
  const now = new Date();
  return (
    (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth())
  );
}

/**
 * Amount-based surcharge tiers.
 * Larger loans carry slightly higher rates to reflect increased risk.
 */
export function getAmountSurcharge(amount: number): number {
  if (amount >= 50000) return 4.0;
  if (amount >= 20000) return 2.5;
  if (amount >= 10000) return 1.5;
  if (amount >= 5000) return 0.75;
  return 0;
}

export function calculateEligibility(
  input: EligibilityInput,
): EligibilityResult {
  const flags: string[] = [];
  let savingsScore = 0,
    activityScore = 0,
    repaymentScore = 0;
  let membershipScore = 0,
    accountScore = 0;

  // 1. Savings balance vs requested (30 pts)
  const ratio = input.savingsBalance / Math.max(input.requestedAmount, 1);
  if (ratio >= 1.0) savingsScore = 30;
  else if (ratio >= 0.5) savingsScore = 20;
  else if (ratio >= 0.25) {
    savingsScore = 12;
    flags.push("Savings balance below 25% of loan amount");
  } else {
    savingsScore = 4;
    flags.push("Savings balance very low relative to loan amount");
  }

  // 2. Transaction activity — last 6 months (20 pts)
  if (input.depositCount6Months >= 12) activityScore = 20;
  else if (input.depositCount6Months >= 6) activityScore = 14;
  else if (input.depositCount6Months >= 2) {
    activityScore = 8;
    flags.push("Low transaction activity");
  } else {
    activityScore = 0;
    flags.push("Minimal transaction activity");
  }
  if (input.totalDeposits6Months >= input.requestedAmount * 0.5)
    activityScore = Math.min(20, activityScore + 4);

  // 3. Repayment history (30 pts)
  const totalPastLoans = input.completedLoans + input.defaultedLoans;
  if (totalPastLoans === 0) {
    repaymentScore = 15;
    flags.push("No previous loan history");
  } else {
    const rate = input.completedLoans / totalPastLoans;
    if (rate === 1.0) repaymentScore = 30;
    else if (rate >= 0.8) repaymentScore = 22;
    else if (rate >= 0.5) {
      repaymentScore = 12;
      flags.push("Some defaults on record");
    } else {
      repaymentScore = 3;
      flags.push("Poor repayment history");
    }
  }
  if (input.activeLoans >= 2) {
    repaymentScore = Math.max(0, repaymentScore - 10);
    flags.push("2+ active loans");
  } else if (input.activeLoans === 1) {
    repaymentScore = Math.max(0, repaymentScore - 5);
    flags.push("Has an active loan");
  }
  if (input.pendingLoans >= 1) flags.push("Has a pending application");

  // 4. Membership duration (10 pts)
  const months = monthsSince(input.clientJoinDate);
  if (months >= 24) membershipScore = 10;
  else if (months >= 12) membershipScore = 7;
  else if (months >= 6) {
    membershipScore = 4;
    flags.push("Member for less than 12 months");
  } else {
    membershipScore = 1;
    flags.push("Member for less than 6 months");
  }

  // 5. Active accounts (10 pts)
  if (input.activeAccountCount >= 2) accountScore = 10;
  else if (input.activeAccountCount === 1) accountScore = 6;
  else {
    accountScore = 0;
    flags.push("No active savings account");
  }

  const score = Math.min(
    100,
    savingsScore +
      activityScore +
      repaymentScore +
      membershipScore +
      accountScore,
  );

  let creditHistory: CreditHistory;
  if (totalPastLoans === 0) creditHistory = "no_history";
  else if (score >= 70) creditHistory = "good";
  else if (score >= 50) creditHistory = "fair";
  else creditHistory = "poor";

  let multiplier = 1;
  if (score >= 80) multiplier = 3;
  else if (score >= 70) multiplier = 2.5;
  else if (score >= 60) multiplier = 2;
  else if (score >= 50) multiplier = 1.5;
  const maxRecommendedAmount = Math.floor(input.savingsBalance * multiplier);

  // Base interest rate from score
  let baseInterestRate: number;
  if (score >= 80) baseInterestRate = 15;
  else if (score >= 70) baseInterestRate = 18;
  else if (score >= 60) baseInterestRate = 22;
  else if (score >= 50) baseInterestRate = 26;
  else baseInterestRate = 30;

  const amountSurcharge = getAmountSurcharge(input.requestedAmount);
  const suggestedInterestRate = baseInterestRate + amountSurcharge;

  return {
    score,
    creditHistory,
    eligible: score >= 50,
    maxRecommendedAmount,
    baseInterestRate,
    amountSurcharge,
    suggestedInterestRate,
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

export function calcRepaymentSchedule(
  principal: number,
  annualRatePct: number,
  months: number,
) {
  const totalInterest = principal * (annualRatePct / 100) * (months / 12);
  const totalPayable = principal + totalInterest;
  return {
    monthlyRepayment: Math.round((totalPayable / months) * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
  };
}

export const DAILY_PENALTY_RATE = 0.02 / 30;
