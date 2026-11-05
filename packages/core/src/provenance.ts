/**
 * Provenance: every number WATTWISE shows must say where it came from,
 * which period it covers, and whether it is measured or estimated.
 */

/** How trustworthy a figure is. */
export type DataQuality =
  /** Read from a meter or an "actual reading" on a bill. */
  | 'measured'
  /** Supplier estimate, or a WATTWISE pro-rata/annualised estimate. */
  | 'estimated'
  /** Computed by the deterministic engine from other confirmed figures. */
  | 'calculated'
  /** Typed in or confirmed by the user. */
  | 'user_confirmed'
  /** Fictional demonstration data. Must always be labelled DEMO in the UI. */
  | 'demo';

/** Where a figure originates. */
export type SourceKind =
  | 'bill' // a bill the user uploaded and confirmed
  | 'manual' // manual entry by the user
  | 'meter' // a connected meter / integration
  | 'official' // official regulator or statistics source
  | 'supplier' // supplier-provided information
  | 'third_party'
  | 'wattwise_calculation'
  | 'demo';

export interface Period {
  /** ISO date (YYYY-MM-DD), inclusive. */
  start: string;
  /** ISO date (YYYY-MM-DD), inclusive. */
  end: string;
}

export interface Sourced<T> {
  value: T;
  unit?: string;
  quality: DataQuality;
  source: SourceKind;
  period?: Period;
  /** Free-text detail, e.g. "Bill EDF 2026-09" or "pro-rata from 2 bills". */
  detail?: string;
}

export function sourced<T>(
  value: T,
  meta: Omit<Sourced<T>, 'value'>,
): Sourced<T> {
  return { value, ...meta };
}

/** The weakest quality wins when figures are combined. */
const QUALITY_RANK: Record<DataQuality, number> = {
  measured: 4,
  user_confirmed: 3,
  calculated: 2,
  estimated: 1,
  demo: 0,
};

export function combineQuality(...qualities: DataQuality[]): DataQuality {
  if (qualities.length === 0) return 'estimated';
  return qualities.reduce((worst, q) =>
    QUALITY_RANK[q] < QUALITY_RANK[worst] ? q : worst,
  );
}
