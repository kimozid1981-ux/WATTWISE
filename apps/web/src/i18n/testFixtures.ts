import type { FindingCode } from '@wattwise/core';

/** Exhaustive list (checked by the compiler) of finding codes that need translations. */
const ALL: Record<FindingCode, true> = {
  READING_ESTIMATED: true,
  READING_UNKNOWN: true,
  TOTAL_NOT_RECONCILED: true,
  LINE_MATH_MISMATCH: true,
  PRICE_UP: true,
  PRICE_DOWN: true,
  CONSUMPTION_UP: true,
  CONSUMPTION_DOWN: true,
  SUBSCRIPTION_CHANGED: true,
  PERIOD_OVERLAP: true,
  PERIOD_GAP: true,
  FIRST_BILL: true,
  MISSING_DETAILS: true,
  GAS_NO_CONVERSION: true,
};
export const FINDING_CODES_FOR_TEST = Object.keys(ALL) as FindingCode[];
