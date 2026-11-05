'use client';

import { LANGUAGE_NAMES, LANGUAGES, isLanguageCode } from '@wattwise/core';
import { Languages } from 'lucide-react';
import { useApp } from './AppProvider';
import { cx, inputClass } from './ui';

export function LanguageSelect({ compact = false, id = 'language' }: { compact?: boolean; id?: string }) {
  const { language, setLanguage, t } = useApp();
  return (
    <div className={cx('relative', compact && 'inline-flex items-center')}>
      {compact && <Languages className="pointer-events-none absolute left-3 size-4 text-muted" aria-hidden />}
      <select
        id={id}
        aria-label={t('profile.language')}
        value={language}
        onChange={(e) => isLanguageCode(e.target.value) && setLanguage(e.target.value)}
        className={cx(inputClass, compact && 'min-h-9 w-auto rounded-full pl-9 text-xs')}
      >
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>
            {LANGUAGE_NAMES[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
