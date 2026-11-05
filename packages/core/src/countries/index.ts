import { COUNTRIES } from './configs';
import type { CountryCode, CountryConfig } from './types';

export * from './types';
export { COUNTRIES } from './configs';

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && value in COUNTRIES;
}

export function getCountry(code: CountryCode): CountryConfig {
  return COUNTRIES[code];
}

/** Countries a user can pick today. */
export function launchCountries(): CountryConfig[] {
  return Object.values(COUNTRIES).filter((c) => c.status === 'launch');
}

export function plannedCountries(): CountryConfig[] {
  return Object.values(COUNTRIES).filter((c) => c.status === 'planned');
}
