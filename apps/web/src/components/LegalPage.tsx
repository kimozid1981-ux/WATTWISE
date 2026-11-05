'use client';

import Link from 'next/link';
import { useApp } from './AppProvider';
import { Logo } from './Logo';
import { Notice } from './ui';
import type { MessageKey } from '@/i18n';

/** Draft legal page. Content must be reviewed by counsel before launch. */
export function LegalPage({ titleKey, sections }: { titleKey: MessageKey; sections: Array<[MessageKey, MessageKey]> }) {
  const { t } = useApp();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" aria-label="WATTWISE">
        <Logo />
      </Link>
      <h1 className="mt-8 font-display text-3xl font-bold">{t(titleKey)}</h1>
      <Notice tone="warn" className="my-6">
        {t('legal.draftNotice')}
      </Notice>
      <div className="space-y-6">
        {sections.map(([h, b]) => (
          <section key={h}>
            <h2 className="font-display text-lg font-semibold">{t(h)}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t(b)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
