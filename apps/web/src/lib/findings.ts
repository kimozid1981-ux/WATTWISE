import { formatMoney, formatNumber, formatDate, type Finding, type FindingCode } from '@wattwise/core';
import type { MessageKey } from '@/i18n';

type T = (key: MessageKey, params?: Record<string, string | number>) => string;

export interface FindingText {
  title: string;
  /** 1. What was identified + 2. why it matters */
  body: string;
  /** 3. What the user could do */
  action: string;
  /** 5. Assumptions and uncertainty */
  caveat: string | null;
}

const CAVEATS: Partial<Record<FindingCode, MessageKey>> = {
  CONSUMPTION_UP: 'finding.caveat.season',
  CONSUMPTION_DOWN: 'finding.caveat.season',
  PRICE_UP: 'finding.caveat.price',
  PRICE_DOWN: 'finding.caveat.price',
  TOTAL_NOT_RECONCILED: 'finding.caveat.capture',
  LINE_MATH_MISMATCH: 'finding.caveat.capture',
};

/** Turns a deterministic finding into plain-language, translated text. */
export function describeFinding(f: Finding, t: T, locale: string): FindingText {
  const p = f.params;
  const currency = typeof p.currency === 'string' ? p.currency : 'EUR';
  const money = (v: unknown, digits = 2) => (typeof v === 'number' ? formatMoney(v, currency, locale, digits) : '');
  const num = (v: unknown, digits = 1) => (typeof v === 'number' ? formatNumber(v, locale, digits) : '');
  const params: Record<string, string | number> = { ...p };

  switch (f.code) {
    case 'TOTAL_NOT_RECONCILED':
      Object.assign(params, { linesTotal: money(p.linesTotal), total: money(p.total), difference: money(p.difference) });
      break;
    case 'LINE_MATH_MISMATCH':
      Object.assign(params, { expected: money(p.expected), printed: money(p.printed), difference: money(p.difference) });
      break;
    case 'PRICE_UP':
    case 'PRICE_DOWN':
      Object.assign(params, {
        current: money(p.current, 4),
        previous: money(p.previous, 4),
        changePct: num(Math.abs(Number(p.changePct))),
        basis: t(p.basis === 'energy' ? 'finding.basis.energy' : 'finding.basis.allIn'),
      });
      break;
    case 'CONSUMPTION_UP':
    case 'CONSUMPTION_DOWN':
      Object.assign(params, {
        current: num(p.current),
        previous: num(p.previous),
        changePct: num(Math.abs(Number(p.changePct))),
        unit: p.unit === 'm3' ? 'm³' : String(p.unit),
      });
      break;
    case 'SUBSCRIPTION_CHANGED':
      Object.assign(params, { current: money(p.current), previous: money(p.previous), changePct: num(Number(p.changePct)) });
      break;
    case 'PERIOD_OVERLAP':
      Object.assign(params, {
        previousStart: formatDate(String(p.previousStart), locale),
        previousEnd: formatDate(String(p.previousEnd), locale),
      });
      break;
    case 'PERIOD_GAP':
      Object.assign(params, { previousEnd: formatDate(String(p.previousEnd), locale) });
      break;
    case 'MISSING_DETAILS':
      params.fields = String(p.fields)
        .split(',')
        .map((k) => t(`field.${k}` as MessageKey))
        .join(', ');
      break;
  }

  const caveatKey = CAVEATS[f.code];
  return {
    title: t(`finding.${f.code}.title` as MessageKey, params),
    body: t(`finding.${f.code}.body` as MessageKey, params),
    action: t(`finding.${f.code}.action` as MessageKey, params),
    caveat: caveatKey ? t(caveatKey) : null,
  };
}
