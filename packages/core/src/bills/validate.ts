import { daysInPeriod, isIsoDate } from '../calc/dates';
import type { BillDraft, ConfirmedBill } from './schema';
import { BillDraftSchema } from './schema';

export type ValidationCode =
  | 'required'
  | 'invalid_date'
  | 'end_before_start'
  | 'period_too_long'
  | 'period_in_future'
  | 'must_be_positive'
  | 'must_not_be_negative'
  | 'unit_not_allowed'
  | 'currency_mismatch'
  | 'invalid_format';

export interface ValidationIssue {
  field: string;
  code: ValidationCode;
}

export type ValidationResult =
  | { ok: true; bill: ConfirmedBill; issues: [] }
  | { ok: false; issues: ValidationIssue[] };

export interface ValidateOptions {
  /** Expected currency for the household's country. */
  expectedCurrency?: string;
  /** "Today" as ISO date, injectable for tests. */
  today?: string;
}

/** Longest billing period accepted (annual bills plus some slack). */
export const MAX_PERIOD_DAYS = 400;

/**
 * Turn a user-reviewed draft into a confirmed bill, or explain exactly which
 * fields block confirmation. Only confirmed bills feed calculations.
 */
export function validateBillDraft(input: unknown, options: ValidateOptions = {}): ValidationResult {
  const parsed = BillDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({ field: i.path.join('.') || 'bill', code: 'invalid_format' })),
    };
  }
  const d: BillDraft = parsed.data;
  const issues: ValidationIssue[] = [];
  const today = options.today ?? new Date().toISOString().slice(0, 10);

  if (!d.energyType) issues.push({ field: 'energyType', code: 'required' });

  const startOk = checkDate(d.periodStart, 'periodStart', issues);
  const endOk = checkDate(d.periodEnd, 'periodEnd', issues);
  if (startOk && endOk) {
    if (d.periodEnd! < d.periodStart!) issues.push({ field: 'periodEnd', code: 'end_before_start' });
    else if (daysInPeriod(d.periodStart!, d.periodEnd!) > MAX_PERIOD_DAYS)
      issues.push({ field: 'periodEnd', code: 'period_too_long' });
    if (d.periodStart! > today) issues.push({ field: 'periodStart', code: 'period_in_future' });
  }
  if (d.issueDate !== null && d.issueDate !== '' && !isIsoDate(d.issueDate))
    issues.push({ field: 'issueDate', code: 'invalid_date' });

  if (d.consumption === null) issues.push({ field: 'consumption', code: 'required' });
  else if (!(d.consumption > 0)) issues.push({ field: 'consumption', code: 'must_be_positive' });

  if (!d.consumptionUnit) issues.push({ field: 'consumptionUnit', code: 'required' });
  else if (d.energyType === 'electricity' && d.consumptionUnit !== 'kWh')
    issues.push({ field: 'consumptionUnit', code: 'unit_not_allowed' });

  if (d.gasConversionFactor !== null && !(d.gasConversionFactor > 0))
    issues.push({ field: 'gasConversionFactor', code: 'must_be_positive' });

  if (d.totalAmount === null) issues.push({ field: 'totalAmount', code: 'required' });
  else if (d.totalAmount < 0) issues.push({ field: 'totalAmount', code: 'must_not_be_negative' });

  const currency = d.currency?.trim().toUpperCase() || null;
  if (!currency) issues.push({ field: 'currency', code: 'required' });
  else if (!/^[A-Z]{3}$/.test(currency)) issues.push({ field: 'currency', code: 'invalid_format' });
  else if (options.expectedCurrency && currency !== options.expectedCurrency)
    issues.push({ field: 'currency', code: 'currency_mismatch' });

  d.lines.forEach((line, i) => {
    if (line.quantity !== null && line.quantity < 0)
      issues.push({ field: `lines.${i}.quantity`, code: 'must_not_be_negative' });
    if (line.unitPrice !== null && line.unitPrice < 0 && line.category !== 'discount')
      issues.push({ field: `lines.${i}.unitPrice`, code: 'must_not_be_negative' });
  });

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    issues: [],
    bill: {
      energyType: d.energyType!,
      supplier: clean(d.supplier),
      contractName: clean(d.contractName),
      periodStart: d.periodStart!,
      periodEnd: d.periodEnd!,
      issueDate: clean(d.issueDate),
      consumption: d.consumption!,
      consumptionUnit: d.consumptionUnit!,
      gasConversionFactor: d.energyType === 'gas' ? d.gasConversionFactor : null,
      readingType: d.readingType,
      lines: d.lines.map((l) => ({ ...l, label: l.label.trim() })),
      totalAmount: d.totalAmount!,
      amountDue: d.amountDue,
      currency: currency!,
      meterReference: clean(d.meterReference),
    },
  };
}

function checkDate(value: string | null, field: string, issues: ValidationIssue[]): boolean {
  if (value === null || value === '') {
    issues.push({ field, code: 'required' });
    return false;
  }
  if (!isIsoDate(value)) {
    issues.push({ field, code: 'invalid_date' });
    return false;
  }
  return true;
}

function clean(v: string | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}
