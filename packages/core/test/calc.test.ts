import { describe, expect, it } from 'vitest';
import {
  addDays,
  applianceCost,
  convertEnergy,
  daysInPeriod,
  gasM3ToKwh,
  isIsoDate,
  monthsInPeriod,
  overlapDays,
  periodMetrics,
  relativeChange,
  round,
} from '../src';

describe('round', () => {
  it('rounds half away from zero, including binary edge cases', () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(2.675, 2)).toBe(2.68);
    expect(round(-1.005, 2)).toBe(-1.01);
    expect(round(0.12345, 4)).toBe(0.1235);
  });
});

describe('dates', () => {
  it('validates ISO dates strictly', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('28/02/2026')).toBe(false);
  });
  it('counts billing days inclusively', () => {
    expect(daysInPeriod('2026-01-01', '2026-01-31')).toBe(31);
    expect(daysInPeriod('2024-02-01', '2024-02-29')).toBe(29); // leap year
    expect(daysInPeriod('2026-03-01', '2026-03-01')).toBe(1);
    // across DST change: still whole days because we work in UTC
    expect(daysInPeriod('2026-03-20', '2026-04-05')).toBe(17);
    expect(() => daysInPeriod('2026-02-01', '2026-01-01')).toThrow();
  });
  it('computes overlaps and month spans', () => {
    expect(overlapDays({ start: '2026-01-15', end: '2026-02-14' }, { start: '2026-02-01', end: '2026-02-28' })).toBe(14);
    expect(overlapDays({ start: '2026-01-01', end: '2026-01-31' }, { start: '2026-02-01', end: '2026-02-28' })).toBe(0);
    expect(monthsInPeriod('2025-11-20', '2026-02-03')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('energy', () => {
  it('converts units', () => {
    expect(convertEnergy(2.5, 'MWh', 'kWh')).toBe(2500);
    expect(convertEnergy(1500, 'Wh', 'kWh')).toBe(1.5);
  });
  it('converts gas only with an explicit factor', () => {
    expect(gasM3ToKwh(100, 10.5)).toBeCloseTo(1050, 6);
    expect(() => gasM3ToKwh(100, 0)).toThrow();
  });
  it('computes appliance running cost', () => {
    // 2000 W heater for 3 h at 0.25/kWh = 6 kWh = 1.50
    expect(applianceCost({ watts: 2000, hours: 3, pricePerKwh: 0.25 })).toEqual({ kwh: 6, cost: 1.5 });
  });
  it('computes daily average and annualised projection', () => {
    // 620 kWh over 31 days = 20 kWh/day = 7300 kWh/year
    expect(periodMetrics(620, '2026-01-01', '2026-01-31')).toEqual({ days: 31, dailyAverage: 20, annualised: 7300 });
  });
  it('computes relative change', () => {
    expect(relativeChange(112, 100)).toBeCloseTo(0.12);
    expect(relativeChange(5, 0)).toBeNull();
  });
});
