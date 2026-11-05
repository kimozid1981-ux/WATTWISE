/** Locale-aware formatting via the built-in Intl API (no hardcoded separators). */

export function formatMoney(amount: number, currency: string, locale: string, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: Math.min(2, maximumFractionDigits),
    maximumFractionDigits,
  }).format(amount);
}

export function formatNumber(value: number, locale: string, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

export function formatEnergy(value: number, unit: string, locale: string, maximumFractionDigits = 1): string {
  const u = unit === 'm3' ? 'm³' : unit;
  return `${formatNumber(value, locale, maximumFractionDigits)} ${u}`;
}

export function formatPercent(pct: number, locale: string): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${formatNumber(pct, locale, 1)} %`;
}

export function formatDate(isoDate: string, locale: string, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: 'UTC' }).format(d);
}

export function formatMonth(monthKey: string, locale: string): string {
  const d = new Date(`${monthKey}-01T00:00:00Z`);
  return new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(d);
}
