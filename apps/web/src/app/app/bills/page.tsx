'use client';

import { toUtcMs } from '@wattwise/core';
import { ChevronRight, FileText, Flame, Plus, Zap } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { ButtonLink, Card, DemoBadge, EmptyState, QualityBadge, Spinner } from '@/components/ui';
import { useFormat } from '@/lib/useFormat';

export default function BillsPage() {
  const { t, bills, billsLoading } = useApp();
  const f = useFormat();
  const sorted = [...bills].sort((a, b) => toUtcMs(b.data.periodEnd) - toUtcMs(a.data.periodEnd));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('bills.title')}</h1>
          <p className="text-sm text-muted">{t('bills.subtitle')}</p>
        </div>
        <ButtonLink href="/app/bills/new">
          <Plus className="size-4" aria-hidden />
          {t('bills.add')}
        </ButtonLink>
      </div>

      {billsLoading && bills.length === 0 ? (
        <Spinner label={t('common.loading')} />
      ) : sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="size-6" aria-hidden />}
            title={t('bills.emptyTitle')}
            body={t('bills.emptyBody')}
            action={<ButtonLink href="/app/bills/new">{t('bills.add')}</ButtonLink>}
          />
        </Card>
      ) : (
        <ul className="grid gap-3">
          {sorted.map((b) => {
            const Icon = b.data.energyType === 'gas' ? Flame : Zap;
            return (
              <li key={b.id}>
                <Link
                  href={`/app/bills/view?id=${encodeURIComponent(b.id)}`}
                  className="card flex items-center gap-4 p-4 transition hover:border-accent/50"
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent-text">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {b.data.supplier ?? t(`energy.${b.data.energyType}`)}{' '}
                      <span className="font-normal text-muted">· {f.period(b.data.periodStart, b.data.periodEnd)}</span>
                    </p>
                    <p className="text-sm text-muted">
                      {f.energy(b.data.consumption, b.data.consumptionUnit, 0)} · {t(`reading.${b.data.readingType}`)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-display font-bold tabular-nums">{f.money(b.data.totalAmount, b.data.currency)}</p>
                    {b.origin === 'demo' ? <DemoBadge /> : <QualityBadge quality="user_confirmed" />}
                  </div>
                  <ChevronRight className="size-4 text-muted" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
