/**
 * Rounding helpers. Money is computed in floating point and rounded only at
 * the end of each calculation step that is shown to the user, using
 * half-away-from-zero like most European invoices.
 */
export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  // Number.EPSILON nudges values such as 1.005 that are stored as 1.00499999...
  const scaled = Math.abs(value) * factor * (1 + Number.EPSILON);
  return (Math.sign(value) * Math.round(scaled)) / factor;
}

export function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (typeof v === 'number' && Number.isFinite(v) ? v : 0), 0);
}

/** Relative change from `previous` to `current`, e.g. 0.12 for +12 %. Null when undefined. */
export function relativeChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export function isPositiveNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}
