// lib/validators.ts

// Ghana Card number — format: GHA-726017025-4
// (literal "GHA-", 9 digits, a dash, then a single check digit)
export const GHANA_CARD_REGEX = /^GHA-\d{9}-\d$/;

export const GHANA_CARD_HINT = "Format: GHA-726017025-4";

export function isValidGhanaCard(value: string): boolean {
  return GHANA_CARD_REGEX.test(value.trim().toUpperCase());
}
