import { z } from 'zod';

/**
 * Bill data model.
 *
 * `BillDraft` is what document extraction (AI) or a blank manual form produces:
 * every field may be missing. Nothing in a draft is used for calculations.
 *
 * `ConfirmedBill` is produced only by `validateBillDraft` after the user has
 * reviewed the draft. Every calculation in WATTWISE runs on confirmed bills.
 */

export const ENERGY_TYPES = ['electricity', 'gas'] as const;
export type EnergyType = (typeof ENERGY_TYPES)[number];

export const LINE_CATEGORIES = [
  'energy', // price per kWh × consumption
  'subscription', // standing charge / abonnement / Grundpreis
  'capacity', // e.g. término de potencia, capacity tariff
  'network', // distribution/transmission charges shown separately
  'tax', // energy excise duties
  'levy', // other levies / contributions
  'vat',
  'meter_rental',
  'discount',
  'other',
] as const;
export type LineCategory = (typeof LINE_CATEGORIES)[number];

export const TIME_BANDS = ['base', 'peak', 'offpeak', 'other'] as const;
export type TimeBand = (typeof TIME_BANDS)[number];

export const READING_TYPES = ['actual', 'estimated', 'mixed', 'unknown'] as const;
export type ReadingType = (typeof READING_TYPES)[number];

export const CONSUMPTION_UNITS = ['kWh', 'm3'] as const;
export type ConsumptionUnit = (typeof CONSUMPTION_UNITS)[number];

const nullableNumber = z.number().finite().nullable();
const nullableString = z.string().nullable();

export const ChargeLineSchema = z.object({
  /** Label exactly as printed on the bill. */
  label: z.string(),
  category: z.enum(LINE_CATEGORIES),
  timeBand: z.enum(TIME_BANDS).nullable(),
  quantity: nullableNumber,
  quantityUnit: nullableString,
  unitPrice: nullableNumber,
  /** Amount of this line in the bill currency, as printed (sign kept: discounts are negative). */
  amount: nullableNumber,
});
export type ChargeLine = z.infer<typeof ChargeLineSchema>;

export const BillDraftSchema = z.object({
  energyType: z.enum(ENERGY_TYPES).nullable(),
  supplier: nullableString,
  contractName: nullableString,
  /** ISO date YYYY-MM-DD */
  periodStart: nullableString,
  periodEnd: nullableString,
  issueDate: nullableString,
  consumption: nullableNumber,
  consumptionUnit: z.enum(CONSUMPTION_UNITS).nullable(),
  /** kWh per m³, only for gas billed by volume. */
  gasConversionFactor: nullableNumber,
  readingType: z.enum(READING_TYPES),
  lines: z.array(ChargeLineSchema),
  /** Total cost of the billing period including taxes (NOT the amount due after instalments). */
  totalAmount: nullableNumber,
  /** Amount left to pay, if the bill shows one (may differ from totalAmount because of instalments). */
  amountDue: nullableNumber,
  currency: nullableString,
  /** Only kept if the user wants it; otherwise dropped for data minimisation. */
  meterReference: nullableString,
  /** Things the extractor noticed but could not map, in plain language. */
  notes: z.array(z.string()),
});
export type BillDraft = z.infer<typeof BillDraftSchema>;

export function emptyBillDraft(partial: Partial<BillDraft> = {}): BillDraft {
  return {
    energyType: null,
    supplier: null,
    contractName: null,
    periodStart: null,
    periodEnd: null,
    issueDate: null,
    consumption: null,
    consumptionUnit: null,
    gasConversionFactor: null,
    readingType: 'unknown',
    lines: [],
    totalAmount: null,
    amountDue: null,
    currency: null,
    meterReference: null,
    notes: [],
    ...partial,
  };
}

export interface ConfirmedBill {
  energyType: EnergyType;
  supplier: string | null;
  contractName: string | null;
  periodStart: string;
  periodEnd: string;
  issueDate: string | null;
  consumption: number;
  consumptionUnit: ConsumptionUnit;
  gasConversionFactor: number | null;
  readingType: ReadingType;
  lines: ChargeLine[];
  totalAmount: number;
  amountDue: number | null;
  currency: string;
  meterReference: string | null;
}

/** How a bill entered WATTWISE. */
export type BillOrigin = 'ai_extraction' | 'manual' | 'demo';

/** A confirmed bill as stored for a household. */
export interface StoredBill {
  id: string;
  origin: BillOrigin;
  /** ISO timestamp the user confirmed the data. */
  confirmedAt: string;
  data: ConfirmedBill;
}
