/**
 * Simple interest loan calculation
 * totalPayable = principal + (principal * rate/100 * duration/12)
 */
export function calculateLoan(
  principal: number,
  interestRate: number,
  durationMonths: number,
) {
  const interest = (principal * (interestRate / 100) * durationMonths) / 12;
  const totalPayable = principal + interest;
  const monthlyPayment = totalPayable / durationMonths;

  return {
    totalPayable: parseFloat(totalPayable.toFixed(2)),
    monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
    totalInterest: parseFloat(interest.toFixed(2)),
  };
}

/**
 * Calculate due date from approval date + duration in months
 */
export function calculateDueDate(
  approvalDate: Date,
  durationMonths: number,
): Date {
  const dueDate = new Date(approvalDate);
  dueDate.setMonth(dueDate.getMonth() + durationMonths);
  return dueDate;
}
