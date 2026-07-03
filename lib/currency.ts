// lib/currency.ts
// Central currency helper. The credit union operates in Ghana Cedis,
// so the UI must render the Cedis sign (₵ / GH₵) rather than "GHS".

export const CEDIS = "₵";

/**
 * Format a number as Ghana Cedis, e.g. formatCedis(1250) => "₵1,250.00".
 */
export function formatCedis(
  amount: number | null | undefined,
  opts: { withCode?: boolean } = {},
): string {
  const value = Number(amount ?? 0);
  const formatted = value.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${opts.withCode ? "GH₵" : CEDIS}${formatted}`;
}
