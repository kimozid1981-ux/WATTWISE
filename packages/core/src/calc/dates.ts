/**
 * Billing-period helpers. All dates are ISO calendar dates (YYYY-MM-DD) and are
 * handled in UTC so results never depend on the device's time zone.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function toUtcMs(isoDate: string): number {
  if (!isIsoDate(isoDate)) throw new RangeError(`Invalid ISO date: ${isoDate}`);
  return Date.parse(`${isoDate}T00:00:00Z`);
}

export function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  return fromUtcMs(toUtcMs(isoDate) + days * DAY_MS);
}

/**
 * Number of days in a billing period, counting both the start and end date.
 * 2026-01-01 → 2026-01-31 = 31 days.
 */
export function daysInPeriod(start: string, end: string): number {
  const diff = (toUtcMs(end) - toUtcMs(start)) / DAY_MS;
  if (diff < 0) throw new RangeError(`Period end ${end} is before start ${start}`);
  return Math.round(diff) + 1;
}

/** Number of days two inclusive periods share (0 when they do not overlap). */
export function overlapDays(
  a: { start: string; end: string },
  b: { start: string; end: string },
): number {
  const start = Math.max(toUtcMs(a.start), toUtcMs(b.start));
  const end = Math.min(toUtcMs(a.end), toUtcMs(b.end));
  if (end < start) return 0;
  return Math.round((end - start) / DAY_MS) + 1;
}

/** "2026-03" for a date. */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** First and last day of the calendar month containing `isoDate`. */
export function monthBounds(isoDate: string): { start: string; end: string } {
  const [y, m] = isoDate.split('-').map(Number) as [number, number];
  const start = fromUtcMs(Date.UTC(y, m - 1, 1));
  const end = fromUtcMs(Date.UTC(y, m, 0));
  return { start, end };
}

/** Calendar months touched by a period, in order, e.g. ["2026-01", "2026-02"]. */
export function monthsInPeriod(start: string, end: string): string[] {
  const out: string[] = [];
  let cursor = monthBounds(start).start;
  const last = monthKey(end);
  // Guard against runaway loops on bad input (max 20 years).
  for (let i = 0; i < 240; i++) {
    const key = monthKey(cursor);
    out.push(key);
    if (key === last) break;
    cursor = addDays(monthBounds(cursor).end, 1);
  }
  return out;
}
