'use client';

import { formatDate, formatEnergy, formatMoney, formatNumber, formatPercent, getCountry } from '@wattwise/core';
import { useMemo } from 'react';
import { useApp } from '@/components/AppProvider';

/** Formatting bound to the user's language + country (e.g. nl-BE), with the country currency. */
export function useFormat() {
  const { profile, language } = useApp();
  return useMemo(() => {
    const country = getCountry(profile?.country ?? 'FR');
    const locale = profile ? `${language}-${country.code}` : language;
    return {
      locale,
      currency: country.currency,
      money: (v: number, currency: string = country.currency, digits = 2) => formatMoney(v, currency, locale, digits),
      energy: (v: number, unit = 'kWh', digits = 1) => formatEnergy(v, unit, locale, digits),
      number: (v: number, digits = 1) => formatNumber(v, locale, digits),
      percent: (v: number) => formatPercent(v, locale),
      date: (iso: string, style: 'short' | 'medium' | 'long' = 'medium') => formatDate(iso, locale, style),
      period: (start: string, end: string) => `${formatDate(start, locale, 'short')} – ${formatDate(end, locale, 'short')}`,
    };
  }, [profile, language]);
}
