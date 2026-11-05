import type { CountryCode, LanguageCode } from '@wattwise/core';
import { de } from './de';
import { en, type MessageKey, type Messages } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { nl } from './nl';
import { pt } from './pt';

export type { MessageKey, Messages };

/** English is complete; other languages fall back to English per key. */
export const DICTIONARIES: Record<LanguageCode, Partial<Messages>> = { en, fr, de, es, pt, nl, it };

export function translate(lang: LanguageCode, key: MessageKey, params?: Record<string, string | number>): string {
  const template = DICTIONARIES[lang]?.[key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

/** Country names come from the browser's Intl data, in the user's language. */
export function countryName(code: CountryCode, lang: LanguageCode): string {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function coverage(lang: LanguageCode): { translated: number; total: number } {
  const total = Object.keys(en).length;
  const translated = Object.keys(DICTIONARIES[lang]).filter((k) => k in en).length;
  return { translated, total };
}
