import { describe, expect, it } from 'vitest';
import {
  analyseBill,
  emptyBillDraft,
  normaliseExtraction,
  validateBillDraft,
  type BillDraft,
  type StoredBill,
} from '../src';

const TODAY = '2026-11-05';

function draft(partial: Partial<BillDraft> = {}): BillDraft {
  return emptyBillDraft({
    energyType: 'electricity',
    supplier: 'Test Supplier',
    contractName: 'Fixed 2026',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    consumption: 620,
    consumptionUnit: 'kWh',
    readingType: 'actual',
    // 620 kWh × 0.2000 = 124.00 ; subscription 15.00 ; VAT 27.80 ; total 166.80
    lines: [
      { label: 'Abonnement', category: 'subscription', timeBand: null, quantity: 1, quantityUnit: 'month', unitPrice: 15, amount: 15 },
      { label: 'Consommation', category: 'energy', timeBand: 'base', quantity: 620, quantityUnit: 'kWh', unitPrice: 0.2, amount: 124 },
      { label: 'TVA', category: 'vat', timeBand: null, quantity: null, quantityUnit: null, unitPrice: null, amount: 27.8 },
    ],
    totalAmount: 166.8,
    currency: 'EUR',
    ...partial,
  });
}

function stored(id: string, d: BillDraft): StoredBill {
  const v = validateBillDraft(d, { today: TODAY });
  if (!v.ok) throw new Error(`invalid test bill: ${JSON.stringify(v.issues)}`);
  return { id, origin: 'manual', confirmedAt: '2026-02-01T00:00:00Z', data: v.bill };
}

describe('validateBillDraft', () => {
  it('confirms a complete draft', () => {
    const r = validateBillDraft(draft(), { today: TODAY, expectedCurrency: 'EUR' });
    expect(r.ok).toBe(true);
  });
  it('lists every blocking field of an empty draft', () => {
    const r = validateBillDraft(emptyBillDraft(), { today: TODAY });
    expect(r.ok).toBe(false);
    const fields = r.issues.map((i) => i.field).sort();
    expect(fields).toEqual(
      ['consumption', 'consumptionUnit', 'currency', 'energyType', 'periodEnd', 'periodStart', 'totalAmount'].sort(),
    );
  });
  it('rejects inconsistent values', () => {
    const r = validateBillDraft(
      draft({ periodStart: '2026-02-01', periodEnd: '2026-01-01', consumption: 0, consumptionUnit: 'm3', currency: 'SEK' }),
      { today: TODAY, expectedCurrency: 'EUR' },
    );
    expect(r.ok).toBe(false);
    expect(r.issues).toEqual(
      expect.arrayContaining([
        { field: 'periodEnd', code: 'end_before_start' },
        { field: 'consumption', code: 'must_be_positive' },
        { field: 'consumptionUnit', code: 'unit_not_allowed' },
        { field: 'currency', code: 'currency_mismatch' },
      ]),
    );
  });
  it('rejects future periods and over-long periods', () => {
    expect(validateBillDraft(draft({ periodStart: '2027-01-01', periodEnd: '2027-01-31' }), { today: TODAY }).ok).toBe(false);
    expect(validateBillDraft(draft({ periodStart: '2024-01-01', periodEnd: '2025-12-31' }), { today: TODAY }).ok).toBe(false);
  });
});

describe('analyseBill', () => {
  it('computes metrics with a transparent breakdown', () => {
    const a = analyseBill(stored('b1', draft()));
    expect(a.metrics).toEqual({
      days: 31,
      consumptionKwh: 620,
      dailyConsumption: 20,
      consumptionUnit: 'kWh',
      dailyCost: 5.38, // 166.80 / 31 = 5.3806
      allInCostPerKwh: 0.269, // 166.80 / 620
      energyUnitPrice: 0.2,
      subscriptionPer30Days: 14.52, // 15 / 31 × 30
      annualisedCost: 1963.94, // 166.80 / 31 × 365
      annualisedConsumption: 7300,
    });
    expect(a.breakdown.linesTotal).toBe(166.8);
    expect(a.breakdown.unexplainedDifference).toBe(0);
    expect(a.lineChecks.every((c) => c.ok)).toBe(true);
    expect(a.findings.map((f) => f.code)).toEqual(['FIRST_BILL']);
  });

  it('flags estimated readings, unreconciled totals and wrong line arithmetic', () => {
    const d = draft({ readingType: 'estimated', totalAmount: 180 });
    d.lines[1] = { ...d.lines[1]!, amount: 130 }; // 620 × 0.2 = 124, printed 130
    const a = analyseBill(stored('b1', d));
    const codes = a.findings.map((f) => f.code);
    expect(codes).toContain('READING_ESTIMATED');
    expect(codes).toContain('LINE_MATH_MISMATCH');
    expect(codes).toContain('TOTAL_NOT_RECONCILED');
    const mismatch = a.findings.find((f) => f.code === 'LINE_MATH_MISMATCH')!;
    expect(mismatch.params).toMatchObject({ expected: 124, printed: 130, difference: 6 });
    // lines now sum to 172.80, total 180 → 7.20 unexplained (> max(1, 2 % × 180 = 3.60))
    expect(a.breakdown.unexplainedDifference).toBe(7.2);
  });

  it('tolerates small rounding differences', () => {
    const a = analyseBill(stored('b1', draft({ totalAmount: 167.5 }))); // 0.70 < 3.35 tolerance
    expect(a.findings.map((f) => f.code)).not.toContain('TOTAL_NOT_RECONCILED');
  });

  it('compares with the previous bill of the same energy type', () => {
    const jan = stored('jan', draft());
    // February: 28 days, 700 kWh at 0.22, subscription 15
    const febDraft = draft({
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
      consumption: 700,
      totalAmount: 202.8, // 154 + 15 + 33.8
      lines: [
        { label: 'Abonnement', category: 'subscription', timeBand: null, quantity: 1, quantityUnit: 'month', unitPrice: 15, amount: 15 },
        { label: 'Consommation', category: 'energy', timeBand: 'base', quantity: 700, quantityUnit: 'kWh', unitPrice: 0.22, amount: 154 },
        { label: 'TVA', category: 'vat', timeBand: null, quantity: null, quantityUnit: null, unitPrice: null, amount: 33.8 },
      ],
    });
    const feb = stored('feb', febDraft);
    const gasBill = stored('gas', draft({ energyType: 'gas', periodStart: '2026-01-15', periodEnd: '2026-02-20' }));
    const a = analyseBill(feb, [jan, feb, gasBill]);
    expect(a.previousBillId).toBe('jan');
    const price = a.findings.find((f) => f.code === 'PRICE_UP')!;
    expect(price.params).toMatchObject({ basis: 'energy', current: 0.22, previous: 0.2, changePct: 10 });
    const cons = a.findings.find((f) => f.code === 'CONSUMPTION_UP')!;
    // 25 kWh/day vs 20 kWh/day = +25 %
    expect(cons.params).toMatchObject({ current: 25, previous: 20, changePct: 25 });
    // Subscription 15/28×30 = 16.07 vs 14.52 → changes per 30 days only because month length differs: +10.7 %
    expect(a.findings.find((f) => f.code === 'SUBSCRIPTION_CHANGED')!.params).toMatchObject({ current: 16.07, previous: 14.52 });
    expect(a.findings.map((f) => f.code)).not.toContain('PERIOD_OVERLAP');
  });

  it('detects overlapping and gapped periods', () => {
    const jan = stored('jan', draft());
    const overlap = stored('o', draft({ periodStart: '2026-01-20', periodEnd: '2026-02-20' }));
    expect(analyseBill(overlap, [jan]).findings.find((f) => f.code === 'PERIOD_OVERLAP')!.params.days).toBe(12);
    const gap = stored('g', draft({ periodStart: '2026-02-10', periodEnd: '2026-03-10' }));
    expect(analyseBill(gap, [jan]).findings.find((f) => f.code === 'PERIOD_GAP')!.params.days).toBe(9);
  });

  it('handles gas billed in m³ with and without a conversion factor', () => {
    const base = { energyType: 'gas' as const, consumption: 100, consumptionUnit: 'm3' as const, lines: [], totalAmount: 120 };
    const noFactor = analyseBill(stored('g1', draft(base)));
    expect(noFactor.metrics.consumptionKwh).toBeNull();
    expect(noFactor.findings.map((f) => f.code)).toContain('GAS_NO_CONVERSION');
    const withFactor = analyseBill(stored('g2', draft({ ...base, gasConversionFactor: 10.5 })));
    expect(withFactor.metrics.consumptionKwh).toBe(1050);
    expect(withFactor.metrics.allInCostPerKwh).toBe(0.1143);
  });
});

describe('normaliseExtraction', () => {
  it('keeps valid values, nulls invalid ones and flags them', () => {
    const r = normaliseExtraction({
      isEnergyBill: true,
      energyType: 'electricity',
      supplier: '  EDF ',
      periodStart: '2026-01-01',
      periodEnd: '31/01/2026',
      consumption: '1 234,5',
      consumptionUnit: 'kWh',
      readingType: 'whatever',
      lines: [{ label: 'Conso', category: 'bogus', quantity: 10, unitPrice: 0.2, amount: 2 }],
      totalAmount: 99.9,
      currency: 'eur',
      notes: ['ok'],
      uncertainFields: ['supplier'],
    });
    expect(r.draft.supplier).toBe('EDF');
    expect(r.draft.periodEnd).toBeNull();
    expect(r.draft.consumption).toBe(1234.5);
    expect(r.draft.readingType).toBe('unknown');
    expect(r.draft.lines[0]!.category).toBe('other');
    expect(r.draft.currency).toBe('EUR');
    expect(r.uncertainFields).toEqual(expect.arrayContaining(['supplier', 'periodEnd', 'readingType']));
  });
  it('survives garbage input', () => {
    const r = normaliseExtraction('not json');
    expect(r.draft.lines).toEqual([]);
    expect(r.draft.totalAmount).toBeNull();
  });
});
