import { describe, expect, it } from 'vitest';
import { COUNTRIES, demoBills, launchCountries, monthlySeries, summariseEnergy, type StoredBill, LANGUAGES } from '../src';

function bill(id: string, start: string, end: string, kwh: number, total: number, extra: Partial<StoredBill['data']> = {}): StoredBill {
  return {
    id,
    origin: 'manual',
    confirmedAt: '2026-01-01T00:00:00Z',
    data: {
      energyType: 'electricity',
      supplier: 'S',
      contractName: null,
      periodStart: start,
      periodEnd: end,
      issueDate: null,
      consumption: kwh,
      consumptionUnit: 'kWh',
      gasConversionFactor: null,
      readingType: 'actual',
      lines: [],
      totalAmount: total,
      amountDue: null,
      currency: 'EUR',
      meterReference: null,
      ...extra,
    },
  };
}

describe('monthlySeries', () => {
  it('spreads a bill across months pro-rata by days', () => {
    // 2026-01-17 → 2026-02-15 = 30 days; 300 kWh / 60 € → 10 kWh & 2 €/day
    const s = monthlySeries([bill('a', '2026-01-17', '2026-02-15', 300, 60)]);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ month: '2026-01', kwh: 150, cost: 30, coveredDays: 15, quality: 'estimated' });
    expect(s[1]).toMatchObject({ month: '2026-02', kwh: 150, cost: 30, coveredDays: 15 });
  });
});

describe('summariseEnergy', () => {
  it('returns null without bills', () => {
    expect(summariseEnergy([], 'electricity')).toBeNull();
  });

  it('annualises a single bill and labels it an estimate', () => {
    const s = summariseEnergy([bill('a', '2026-01-01', '2026-01-31', 620, 155)], 'electricity')!;
    expect(s.annual).toMatchObject({ method: 'annualised', cost: 1825, consumption: 7300, quality: 'estimated' });
    expect(s.latest).toMatchObject({ dailyConsumption: 20, dailyCost: 5, weeklyConsumption: 140, weeklyCost: 35 });
    expect(s.comparison).toBeNull();
  });

  it('uses the real last 12 months when a full year is covered', () => {
    const bills = [
      bill('h1', '2025-01-01', '2025-06-30', 1810, 400), // 181 days
      bill('h2', '2025-07-01', '2025-12-31', 1840, 420), // 184 days
    ];
    const s = summariseEnergy(bills, 'electricity')!;
    expect(s.annual.method).toBe('last_12_months');
    expect(s.annual.cost).toBe(820);
    expect(s.annual.consumption).toBe(3650);
    expect(s.comparison).toMatchObject({ previousBillId: 'h1', dailyConsumptionChangePct: 0 });
  });

  it('flags overlapping bills and falls back to annualising', () => {
    const s = summariseEnergy(
      [bill('a', '2025-01-01', '2025-12-31', 3650, 800), bill('b', '2025-12-01', '2025-12-31', 300, 70)],
      'electricity',
    )!;
    expect(s.hasOverlappingBills).toBe(true);
    expect(s.annual.method).toBe('annualised');
  });

  it('marks demo data as demo', () => {
    const s = summariseEnergy(demoBills(COUNTRIES.FR, '2026-11-05'), 'electricity')!;
    expect(s.isDemo).toBe(true);
    expect(s.annual.quality).toBe('demo');
    expect(s.latest.readingQuality).toBe('demo');
    expect(s.billCount).toBe(12);
    expect(s.latestPeriod).toEqual({ start: '2026-10-01', end: '2026-10-31' });
  });
});

describe('country configuration', () => {
  it('offers the six launch countries with complete structural data', () => {
    expect(launchCountries().map((c) => c.code).sort()).toEqual(['BE', 'DE', 'ES', 'FR', 'NL', 'PT']);
    for (const c of launchCountries()) {
      expect(c.languages.every((l) => (LANGUAGES as readonly string[]).includes(l))).toBe(true);
      expect(c.languages).toContain(c.defaultLanguage);
      expect(c.electricity.tariffStructures.length).toBeGreaterThan(0);
      expect(c.billTerms.length).toBeGreaterThan(0);
      expect(c.officialSources.every((s) => s.url.startsWith('https://'))).toBe(true);
      expect(() => new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.currency })).not.toThrow();
    }
  });
  it('never stores prices or tax rates in country config', () => {
    const json = JSON.stringify(COUNTRIES);
    expect(json).not.toMatch(/"(price|rate|vatRate|taxRate)"\s*:/i);
  });
});
