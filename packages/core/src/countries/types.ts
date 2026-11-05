import type { LanguageCode } from '../languages';

export type CountryCode =
  | 'FR'
  | 'BE'
  | 'DE'
  | 'ES'
  | 'PT'
  | 'NL'
  | 'IT'
  | 'LU'
  | 'AT'
  | 'IE'
  | 'DK'
  | 'SE';

/** launch = available in onboarding; planned = architecture ready, not offered yet. */
export type CountryStatus = 'launch' | 'planned';

export type CurrencyCode = 'EUR' | 'DKK' | 'SEK';

/** A local term the user will see on their bill, with a plain-language key. */
export interface BillTerm {
  /** Term exactly as printed on local bills. */
  local: string;
  /** Which concept it maps to in the WATTWISE data model. */
  concept:
    | 'subscription'
    | 'energy_price'
    | 'network_charge'
    | 'energy_tax'
    | 'vat'
    | 'levy'
    | 'capacity'
    | 'meter_rental'
    | 'other';
}

export interface TariffStructure {
  /** Stable id used in data, e.g. "fr_hphc". */
  id: string;
  /** Local commercial name, e.g. "Heures Pleines / Heures Creuses". */
  localName: string;
  kind: 'single' | 'time_of_use' | 'dynamic' | 'dynamic_day_type' | 'capacity_based';
}

export interface OfficialSource {
  name: string;
  url: string;
  kind: 'regulator' | 'comparator' | 'ombudsman' | 'statistics' | 'network_data';
}

export interface SmartMeterInfo {
  /** Commonly used name for the smart meter / programme. */
  name: string;
  /** Short factual note about data access. Never assume real-time access. */
  dataAccessNote: string;
}

export interface CountryConfig {
  code: CountryCode;
  status: CountryStatus;
  currency: CurrencyCode;
  /** BCP-47 locale used for number/date/currency formatting. */
  locale: string;
  defaultLanguage: LanguageCode;
  languages: LanguageCode[];
  electricity: {
    unit: 'kWh';
    tariffStructures: TariffStructure[];
    /** Whether bills usually show a separate standing charge / subscription. */
    hasStandingCharge: boolean;
  };
  gas: {
    /** Whether WATTWISE supports gas bills for this country in the current release. */
    supported: boolean;
    /** Unit bills usually show the consumption in. */
    billingUnit: 'kWh' | 'm3';
    note?: string;
  };
  billTerms: BillTerm[];
  officialSources: OfficialSource[];
  smartMeter?: SmartMeterInfo;
  /**
   * When a human last checked this configuration against official sources.
   * Regulations change: anything older than a year must be re-verified before
   * it is shown as current information.
   */
  lastReviewed: string;
  /**
   * draft = compiled by the engineering team from general knowledge and NOT yet
   * checked line by line against the official sources above. The UI must say so.
   */
  reviewStatus: 'draft' | 'verified';
}
