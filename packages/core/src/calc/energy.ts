import { round } from './numbers';
import { daysInPeriod } from './dates';

export type EnergyUnit = 'kWh' | 'MWh' | 'Wh' | 'm3';

/** Convert between electrical energy units. Gas volume (m³) needs `gasM3ToKwh`. */
export function convertEnergy(value: number, from: Exclude<EnergyUnit, 'm3'>, to: Exclude<EnergyUnit, 'm3'>): number {
  const toKwh: Record<Exclude<EnergyUnit, 'm3'>, number> = { Wh: 0.001, kWh: 1, MWh: 1000 };
  return (value * toKwh[from]) / toKwh[to];
}

/**
 * Convert a gas volume to energy. The conversion factor (kWh per m³) depends on
 * the gas quality and local conditions and MUST come from the user's bill:
 * WATTWISE never assumes a default.
 */
export function gasM3ToKwh(m3: number, kwhPerM3: number): number {
  if (!(kwhPerM3 > 0)) throw new RangeError('A positive gas conversion factor (kWh/m³) is required');
  return m3 * kwhPerM3;
}

/** Cost of running an appliance: power (W) × hours × price per kWh. */
export function applianceCost(params: { watts: number; hours: number; pricePerKwh: number }): {
  kwh: number;
  cost: number;
} {
  const kwh = (params.watts / 1000) * params.hours;
  return { kwh: round(kwh, 3), cost: round(kwh * params.pricePerKwh, 2) };
}

export interface PeriodMetrics {
  days: number;
  dailyAverage: number;
  /** Linear 365-day projection. Always an estimate. */
  annualised: number;
}

/** Daily average and 365-day projection of a quantity measured over a period. */
export function periodMetrics(value: number, start: string, end: string, decimals = 2): PeriodMetrics {
  const days = daysInPeriod(start, end);
  const daily = value / days;
  return {
    days,
    dailyAverage: round(daily, decimals),
    annualised: round(daily * 365, decimals),
  };
}
