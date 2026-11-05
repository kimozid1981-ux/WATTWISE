export const LANGUAGES = ['en', 'fr', 'de', 'es', 'pt', 'nl', 'it'] as const;
export type LanguageCode = (typeof LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  nl: 'Nederlands',
  it: 'Italiano',
};

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
