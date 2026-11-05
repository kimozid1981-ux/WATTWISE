import { daysInPeriod, overlapDays, toUtcMs } from '../calc/dates';
import { gasM3ToKwh } from '../calc/energy';
import { relativeChange, round, sum } from '../calc/numbers';
import type { ChargeLine, ConfirmedBill, LineCategory, StoredBill } from './schema';

/**
 * Deterministic bill analysis. No AI is involved here: every number is
 * computed from confirmed bill data, and every finding carries the evidence
 * behind it as parameters so the UI can explain it (and translate it).
 */

export type FindingCode =
  | 'READING_ESTIMATED'
  | 'READING_UNKNOWN'
  | 'TOTAL_NOT_RECONCILED'
  | 'LINE_MATH_MISMATCH'
  | 'PRICE_UP'
  | 'PRICE_DOWN'
  | 'CONSUMPTION_UP'
  | 'CONSUMPTION_DOWN'
  | 'SUBSCRIPTION_CHANGED'
  | 'PERIOD_OVERLAP'
  | 'PERIOD_GAP'
  | 'FIRST_BILL'
  | 'MISSING_DETAILS'
  | 'GAS_NO_CONVERSION';

export type FindingSeverity = 'attention' | 'info' | 'positive';

export interface Finding {
  code: FindingCode;
  severity: FindingSeverity;
  /** Evidence used to build the explanation. Numbers are already rounded. */
  params: Record<string, string | number>;
}

export interface LineCheck {
  index: number;
  label: string;
  expected: number;
  printed: number;
  difference: number;
  ok: boolean;
}

export interface BillMetrics {
  days: number;
  /** Consumption converted to kWh, or null for gas in m³ without a conversion factor. */
  consumptionKwh: number | null;
  /** Daily consumption in the bill's own unit. */
  dailyConsumption: number;
  consumptionUnit: string;
  dailyCost: number;
  /** Total ÷ kWh: everything included (subscription, taxes, VAT). */
  allInCostPerKwh: number | null;
  /** Weighted average of the energy lines only (excludes fixed charges), if lines allow it. */
  energyUnitPrice: number | null;
  /** Fixed/subscription cost per 30 days, if identifiable. */
  subscriptionPer30Days: number | null;
  /** 365-day linear projections: always estimates. */
  annualisedCost: number;
  annualisedConsumption: number;
}

export interface BillAnalysis {
  billId: string;
  previousBillId: string | null;
  metrics: BillMetrics;
  breakdown: {
    byCategory: Partial<Record<LineCategory, number>>;
    linesTotal: number | null;
    /** Total minus captured lines; null if no line amounts were captured. */
    unexplainedDifference: number | null;
  };
  lineChecks: LineCheck[];
  findings: Finding[];
}

export const THRESHOLDS = {
  /** Relative change in energy price considered notable. */
  price: 0.03,
  /** Relative change in daily consumption considered notable. */
  consumption: 0.2,
  /** Relative change in subscription per day considered notable. */
  subscription: 0.02,
  /** Reconciliation tolerance: max(absolute, relative × total). */
  reconcileAbs: 1,
  reconcileRel: 0.02,
  /** Line check tolerance: max(absolute, relative × amount). */
  lineAbs: 0.05,
  lineRel: 0.01,
  /** Gap between bills considered notable (days). */
  gapDays: 3,
};

export function consumptionInKwh(bill: ConfirmedBill): number | null {
  if (bill.consumptionUnit === 'kWh') return bill.consumption;
  if (bill.gasConversionFactor && bill.gasConversionFactor > 0)
    return gasM3ToKwh(bill.consumption, bill.gasConversionFactor);
  return null;
}

/** Weighted average energy price per kWh from lines with a kWh quantity and amount. */
export function energyUnitPrice(bill: ConfirmedBill): number | null {
  const energy = bill.lines.filter(
    (l) => l.category === 'energy' && l.quantity !== null && l.quantity > 0 && isKwh(l.quantityUnit),
  );
  if (energy.length === 0) return null;
  const qty = sum(energy.map((l) => l.quantity));
  const amount = sum(energy.map((l) => lineAmount(l)));
  if (!(qty > 0) || amount === 0) return null;
  return amount / qty;
}

function subscriptionPerDay(bill: ConfirmedBill): number | null {
  const subs = bill.lines.filter((l) => l.category === 'subscription' && l.amount !== null);
  if (subs.length === 0) return null;
  return sum(subs.map((l) => l.amount)) / daysInPeriod(bill.periodStart, bill.periodEnd);
}

function isKwh(unit: string | null): boolean {
  return !!unit && unit.replace(/\s/g, '').toLowerCase() === 'kwh';
}

/** Printed amount, or quantity × unit price if no amount was printed. */
function lineAmount(l: ChargeLine): number {
  if (l.amount !== null) return l.amount;
  if (l.quantity !== null && l.unitPrice !== null) return l.quantity * l.unitPrice;
  return 0;
}

export function computeMetrics(bill: ConfirmedBill): BillMetrics {
  const days = daysInPeriod(bill.periodStart, bill.periodEnd);
  const kwh = consumptionInKwh(bill);
  const unitPrice = energyUnitPrice(bill);
  const subDay = subscriptionPerDay(bill);
  return {
    days,
    consumptionKwh: kwh === null ? null : round(kwh, 2),
    dailyConsumption: round(bill.consumption / days, 2),
    consumptionUnit: bill.consumptionUnit,
    dailyCost: round(bill.totalAmount / days, 2),
    allInCostPerKwh: kwh ? round(bill.totalAmount / kwh, 4) : null,
    energyUnitPrice: unitPrice === null ? null : round(unitPrice, 4),
    subscriptionPer30Days: subDay === null ? null : round(subDay * 30, 2),
    annualisedCost: round((bill.totalAmount / days) * 365, 2),
    annualisedConsumption: round((bill.consumption / days) * 365, 0),
  };
}

/** Most recent earlier bill of the same energy type (by period end). */
export function findPreviousBill(bill: StoredBill, history: StoredBill[]): StoredBill | null {
  const candidates = history.filter(
    (h) =>
      h.id !== bill.id &&
      h.data.energyType === bill.data.energyType &&
      toUtcMs(h.data.periodEnd) < toUtcMs(bill.data.periodEnd),
  );
  candidates.sort((a, b) => toUtcMs(b.data.periodEnd) - toUtcMs(a.data.periodEnd));
  return candidates[0] ?? null;
}

export function analyseBill(bill: StoredBill, history: StoredBill[] = []): BillAnalysis {
  const d = bill.data;
  const metrics = computeMetrics(d);
  const findings: Finding[] = [];

  // 1. Reading type
  if (d.readingType === 'estimated' || d.readingType === 'mixed')
    findings.push({ code: 'READING_ESTIMATED', severity: 'attention', params: { readingType: d.readingType } });
  else if (d.readingType === 'unknown') findings.push({ code: 'READING_UNKNOWN', severity: 'info', params: {} });

  if (d.energyType === 'gas' && d.consumptionUnit === 'm3' && !d.gasConversionFactor)
    findings.push({ code: 'GAS_NO_CONVERSION', severity: 'info', params: {} });

  // 2. Breakdown and reconciliation
  const byCategory: Partial<Record<LineCategory, number>> = {};
  const withAmount = d.lines.filter((l) => l.amount !== null);
  for (const l of withAmount) byCategory[l.category] = round((byCategory[l.category] ?? 0) + l.amount!, 2);
  const linesTotal = withAmount.length > 0 ? round(sum(withAmount.map((l) => l.amount)), 2) : null;
  const unexplained = linesTotal === null ? null : round(d.totalAmount - linesTotal, 2);
  if (unexplained !== null) {
    const tolerance = Math.max(THRESHOLDS.reconcileAbs, THRESHOLDS.reconcileRel * d.totalAmount);
    if (Math.abs(unexplained) > tolerance)
      findings.push({
        code: 'TOTAL_NOT_RECONCILED',
        severity: 'attention',
        params: { linesTotal: linesTotal!, total: d.totalAmount, difference: unexplained, currency: d.currency },
      });
  }

  // 3. Line arithmetic: quantity × unit price vs printed amount
  const lineChecks: LineCheck[] = [];
  d.lines.forEach((l, index) => {
    if (l.quantity === null || l.unitPrice === null || l.amount === null) return;
    const expected = round(l.quantity * l.unitPrice, 2);
    const difference = round(l.amount - expected, 2);
    const tol = Math.max(THRESHOLDS.lineAbs, THRESHOLDS.lineRel * Math.abs(l.amount));
    const ok = Math.abs(difference) <= tol;
    lineChecks.push({ index, label: l.label, expected, printed: l.amount, difference, ok });
    if (!ok)
      findings.push({
        code: 'LINE_MATH_MISMATCH',
        severity: 'attention',
        params: { label: l.label, expected, printed: l.amount, difference, currency: d.currency },
      });
  });

  // 4. Missing details that limit the analysis
  const missing: string[] = [];
  if (!d.supplier) missing.push('supplier');
  if (!d.contractName) missing.push('contractName');
  if (d.lines.length === 0) missing.push('lines');
  else if (metrics.energyUnitPrice === null) missing.push('energyUnitPrice');
  if (missing.length > 0) findings.push({ code: 'MISSING_DETAILS', severity: 'info', params: { fields: missing.join(',') } });

  // 5. Comparison with the previous bill of the same energy
  const previous = findPreviousBill(bill, history);
  if (!previous) {
    findings.push({ code: 'FIRST_BILL', severity: 'info', params: {} });
  } else {
    const p = previous.data;
    const pm = computeMetrics(p);

    const overlap = overlapDays(
      { start: d.periodStart, end: d.periodEnd },
      { start: p.periodStart, end: p.periodEnd },
    );
    if (overlap > 0)
      findings.push({
        code: 'PERIOD_OVERLAP',
        severity: 'attention',
        params: { days: overlap, previousStart: p.periodStart, previousEnd: p.periodEnd },
      });
    else {
      const gap = daysInPeriod(p.periodEnd, d.periodStart) - 2;
      if (gap > THRESHOLDS.gapDays)
        findings.push({ code: 'PERIOD_GAP', severity: 'info', params: { days: gap, previousEnd: p.periodEnd } });
    }

    // Price: prefer energy-only unit price; fall back to all-in cost per kWh.
    let basis: 'energy' | 'all_in' | null = null;
    let cur: number | null = null;
    let prev: number | null = null;
    if (metrics.energyUnitPrice !== null && pm.energyUnitPrice !== null) {
      basis = 'energy';
      cur = metrics.energyUnitPrice;
      prev = pm.energyUnitPrice;
    } else if (metrics.allInCostPerKwh !== null && pm.allInCostPerKwh !== null) {
      basis = 'all_in';
      cur = metrics.allInCostPerKwh;
      prev = pm.allInCostPerKwh;
    }
    if (basis && cur !== null && prev !== null) {
      const change = relativeChange(cur, prev);
      if (change !== null && Math.abs(change) >= THRESHOLDS.price)
        findings.push({
          code: change > 0 ? 'PRICE_UP' : 'PRICE_DOWN',
          severity: change > 0 ? 'attention' : 'positive',
          params: { basis, current: cur, previous: prev, changePct: round(change * 100, 1), currency: d.currency },
        });
    }

    if (d.consumptionUnit === p.consumptionUnit) {
      const change = relativeChange(metrics.dailyConsumption, pm.dailyConsumption);
      if (change !== null && Math.abs(change) >= THRESHOLDS.consumption)
        findings.push({
          code: change > 0 ? 'CONSUMPTION_UP' : 'CONSUMPTION_DOWN',
          severity: change > 0 ? 'attention' : 'positive',
          params: {
            current: metrics.dailyConsumption,
            previous: pm.dailyConsumption,
            unit: d.consumptionUnit,
            changePct: round(change * 100, 1),
          },
        });
    }

    if (metrics.subscriptionPer30Days !== null && pm.subscriptionPer30Days !== null) {
      const change = relativeChange(metrics.subscriptionPer30Days, pm.subscriptionPer30Days);
      if (change !== null && Math.abs(change) >= THRESHOLDS.subscription)
        findings.push({
          code: 'SUBSCRIPTION_CHANGED',
          severity: 'info',
          params: {
            current: metrics.subscriptionPer30Days,
            previous: pm.subscriptionPer30Days,
            changePct: round(change * 100, 1),
            currency: d.currency,
          },
        });
    }
  }

  return {
    billId: bill.id,
    previousBillId: previous?.id ?? null,
    metrics,
    breakdown: { byCategory, linesTotal, unexplainedDifference: unexplained },
    lineChecks,
    findings,
  };
}
