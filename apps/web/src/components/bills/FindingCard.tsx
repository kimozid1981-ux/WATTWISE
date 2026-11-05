'use client';

import type { Finding } from '@wattwise/core';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { describeFinding } from '@/lib/findings';
import { useFormat } from '@/lib/useFormat';
import { useApp } from '../AppProvider';
import { cx } from '../ui';

export function FindingCard({ finding, compact = false }: { finding: Finding; compact?: boolean }) {
  const { t } = useApp();
  const { locale } = useFormat();
  const text = describeFinding(finding, t, locale);
  const Icon = finding.severity === 'attention' ? AlertTriangle : finding.severity === 'positive' ? CheckCircle2 : Info;
  const tone =
    finding.severity === 'attention'
      ? 'bg-warn/12 text-warn'
      : finding.severity === 'positive'
        ? 'bg-accent/12 text-accent-text'
        : 'bg-blue/12 text-blue';
  return (
    <article className="flex gap-3 rounded-2xl border border-line bg-surface-2 p-4" data-finding={finding.code}>
      <div className={cx('grid size-9 shrink-0 place-items-center rounded-xl', tone)}>
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 space-y-1.5 text-sm">
        <h3 className="font-semibold">{text.title}</h3>
        <p className="text-muted">{text.body}</p>
        {!compact && (
          <>
            <p>
              <span className="font-medium text-accent-text">{t('finding.whatToDo')} </span>
              {text.action}
            </p>
            {text.caveat && <p className="text-xs text-muted italic">{text.caveat}</p>}
          </>
        )}
      </div>
    </article>
  );
}
