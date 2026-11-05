import { addDays, daysInPeriod, monthBounds, monthsInPeriod, overlapDays, toUtcMs } from '../calc/dates';
import { relativeChange, round } from '../calc/numbers';
import { combineQuality, type DataQuality, type Period } from '../provenance';
import { computeMetrics, consumptionInKwh, findPreviousBill } from '../bills/analyse';
import type { EnergyType, StoredBill } from '../bills/schema';

/**
 * Dashboard figures derived from confirmed bills.
 *
 * Bills cover arbitrary periods, so monthly/weekly/daily figures are spread
 * evenly across the days of each bill ("pro-rata"). That is an estimate and
 * is always labelled as such: it is NOT a meter reading.
 */

export interface MonthlyPoint {
  month: string; // YYYY-MM
  /** kWh allocated to this month (null if a bill lacks a kWh conversion). */
  kwh: number | null;
  cost: number;
  /** Days of this month covered by at least one bill. */
  coveredDays: number;
  daysInMonth: number;
  quality: DataQuality;
  billIds: string[];
}

export interface EnergySummary {
  energyType: EnergyType;
  currency: string;
  billCount: number;
  latestBillId: string;
  latestPeriod: Period;
  latest: {
    consumption: number;
    unit: string;
    cost: number;
    dailyConsumption: number;
    dailyCost: number;
    /** Daily average × 7. Estimate. */
    weeklyConsumption: number;
    weeklyCost: number;
    readingQuality: DataQuality;
  };
  comparison: {
    previousBillId: string;
    previousPeriod: Period;
    dailyConsumptionChangePct: number | null;
    dailyCostChangePct: number | null;
  } | null;
  /** Annual cost and consumption estimate with the method used. */
  annual: {
    cost: number;
    consumption: number;
    unit: string;
    method: 'last_12_months' | 'annualised';
    coveredDays: number;
    quality: DataQuality;
  };
  tariff: {
    supplier: string | null;
    contractName: string | null;
    energyUnitPrice: number | null;
    allInCostPerKwh: number | null;
    subscriptionPer30Days: number | null;
    sourceBillId: string;
  };
  monthly: MonthlyPoint[];
  /** True if any two bills of this energy type overlap (figures may double count). */
  hasOverlappingBills: boolean;
  isDemo: boolean;
}

function billQuality(b: StoredBill): DataQuality {
  if (b.origin === 'demo') return 'demo';
  return b.data.readingType === 'actual' ? 'measured' : 'estimated';
}

export function monthlySeries(bills: StoredBill[]): MonthlyPoint[] {
  const map = new Map<string, MonthlyPoint>();
  for (const b of bills) {
    const d = b.data;
    const days = daysInPeriod(d.periodStart, d.periodEnd);
    const kwh = consumptionInKwh(d);
    for (const key of monthsInPeriod(d.periodStart, d.periodEnd)) {
      const bounds = monthBounds(`${key}-01`);
      const ov = overlapDays(bounds, { start: d.periodStart, end: d.periodEnd });
      const share = ov / days;
      const point =
        map.get(key) ??
        ({
          month: key,
          kwh: 0,
          cost: 0,
          coveredDays: 0,
          daysInMonth: daysInPeriod(bounds.start, bounds.end),
          quality: 'estimated',
          billIds: [],
        } satisfies MonthlyPoint);
      point.cost += d.totalAmount * share;
      point.kwh = point.kwh === null || kwh === null ? null : point.kwh + kwh * share;
      point.coveredDays = Math.min(point.daysInMonth, point.coveredDays + ov);
      // Pro-rata allocation is always an estimate (or demo).
      point.quality = combineQuality(point.quality, billQuality(b), 'estimated');
      point.billIds.push(b.id);
      map.set(key, point);
    }
  }
  return [...map.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((p) => ({ ...p, cost: round(p.cost, 2), kwh: p.kwh === null ? null : round(p.kwh, 1) }));
}

function anyOverlap(bills: StoredBill[]): boolean {
  const sorted = [...bills].sort((a, b) => toUtcMs(a.data.periodStart) - toUtcMs(b.data.periodStart));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!.data;
    const cur = sorted[i]!.data;
    if (overlapDays({ start: prev.periodStart, end: prev.periodEnd }, { start: cur.periodStart, end: cur.periodEnd }) > 0)
      return true;
  }
  return false;
}

/** Summary for one energy type, or null if there is no confirmed bill. */
export function summariseEnergy(allBills: StoredBill[], energyType: EnergyType): EnergySummary | null {
  const bills = allBills.filter((b) => b.data.energyType === energyType);
  if (bills.length === 0) return null;
  const sorted = [...bills].sort((a, b) => toUtcMs(b.data.periodEnd) - toUtcMs(a.data.periodEnd));
  const latest = sorted[0]!;
  const ld = latest.data;
  const lm = computeMetrics(ld);
  const previous = findPreviousBill(latest, bills);
  const pm = previous ? computeMetrics(previous.data) : null;

  // Annual estimate: use the 365 days ending at the latest bill when fully covered.
  const windowEnd = ld.periodEnd;
  const windowStart = addDays(windowEnd, -364);
  let cost = 0;
  let consumption = 0;
  let covered = 0;
  const sameUnit = bills.every((b) => b.data.consumptionUnit === ld.consumptionUnit);
  for (const b of bills) {
    const d = b.data;
    const days = daysInPeriod(d.periodStart, d.periodEnd);
    const ov = overlapDays({ start: windowStart, end: windowEnd }, { start: d.periodStart, end: d.periodEnd });
    if (ov === 0) continue;
    cost += (d.totalAmount * ov) / days;
    if (sameUnit) consumption += (d.consumption * ov) / days;
    covered += ov;
  }
  const overlapping = anyOverlap(bills);
  const fullYear = covered >= 365 && !overlapping && sameUnit;
  const isDemo = bills.some((b) => b.origin === 'demo');
  const annual = fullYear
    ? {
        cost: round(cost, 2),
        consumption: round(consumption, 0),
        method: 'last_12_months' as const,
        coveredDays: 365,
      }
    : {
        cost: lm.annualisedCost,
        consumption: lm.annualisedConsumption,
        method: 'annualised' as const,
        coveredDays: lm.days,
      };

  return {
    energyType,
    currency: ld.currency,
    billCount: bills.length,
    latestBillId: latest.id,
    latestPeriod: { start: ld.periodStart, end: ld.periodEnd },
    latest: {
      consumption: ld.consumption,
      unit: ld.consumptionUnit,
      cost: ld.totalAmount,
      dailyConsumption: lm.dailyConsumption,
      dailyCost: lm.dailyCost,
      weeklyConsumption: round((ld.consumption / lm.days) * 7, 1),
      weeklyCost: round((ld.totalAmount / lm.days) * 7, 2),
      readingQuality: billQuality(latest),
    },
    comparison:
      previous && pm
        ? {
            previousBillId: previous.id,
            previousPeriod: { start: previous.data.periodStart, end: previous.data.periodEnd },
            dailyConsumptionChangePct:
              previous.data.consumptionUnit === ld.consumptionUnit
                ? pct(relativeChange(lm.dailyConsumption, pm.dailyConsumption))
                : null,
            dailyCostChangePct: pct(relativeChange(lm.dailyCost, pm.dailyCost)),
          }
        : null,
    annual: {
      ...annual,
      unit: ld.consumptionUnit,
      quality: isDemo ? 'demo' : 'estimated',
    },
    tariff: {
      supplier: ld.supplier,
      contractName: ld.contractName,
      energyUnitPrice: lm.energyUnitPrice,
      allInCostPerKwh: lm.allInCostPerKwh,
      subscriptionPer30Days: lm.subscriptionPer30Days,
      sourceBillId: latest.id,
    },
    monthly: monthlySeries(bills),
    hasOverlappingBills: overlapping,
    isDemo,
  };
}

function pct(v: number | null): number | null {
  return v === null ? null : round(v * 100, 1);
}

