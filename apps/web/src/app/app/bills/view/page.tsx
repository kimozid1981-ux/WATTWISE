'use client';

import { analyseBill, type LineCategory } from '@wattwise/core';
import { ArrowLeft, Calculator, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { FindingCard } from '@/components/bills/FindingCard';
import { Button, Card, DemoBadge, EmptyState, Notice, QualityBadge, SectionTitle, Spinner } from '@/components/ui';
import type { MessageKey } from '@/i18n';
import { useFormat } from '@/lib/useFormat';

export default function BillViewPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <BillView />
    </Suspense>
  );
}

function BillView() {
  const { t, bills, billsLoading, store, refreshBills } = useApp();
  const f = useFormat();
  const router = useRouter();
  const id = useSearchParams().get('id');
  const bill = bills.find((b) => b.id === id) ?? null;
  const analysis = useMemo(() => (bill ? analyseBill(bill, bills) : null), [bill, bills]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (billsLoading && !bill) return <Spinner label={t('common.loading')} />;
  if (!bill || !analysis)
    return (
      <Card>
        <EmptyState
          icon={<Calculator className="size-6" aria-hidden />}
          title={t('bill.notFound')}
          body={t('bill.notFoundBody')}
          action={
            <Link href="/app/bills" className="text-accent-text underline">
              {t('bills.title')}
            </Link>
          }
        />
      </Card>
    );

  const d = bill.data;
  const m = analysis.metrics;
  const cur = d.currency;
  const isDemo = bill.origin === 'demo';
  const attention = analysis.findings.filter((x) => x.severity === 'attention');
  const others = analysis.findings.filter((x) => x.severity !== 'attention');

  const remove = async () => {
    if (!store) return;
    setDeleting(true);
    try {
      await store.deleteBill(bill.id);
      await refreshBills();
      router.replace('/app/bills');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  };

  const rows: Array<[string, string, MessageKey?]> = [
    [t('metric.days'), f.number(m.days, 0)],
    [t('metric.dailyConsumption'), f.energy(m.dailyConsumption, d.consumptionUnit, 2)],
    [t('metric.dailyCost'), f.money(m.dailyCost, cur)],
    ...(m.consumptionKwh !== null && d.consumptionUnit !== 'kWh' ? [[t('metric.kwh'), f.energy(m.consumptionKwh, 'kWh', 0)] as [string, string]] : []),
    [t('metric.energyUnitPrice'), m.energyUnitPrice !== null ? `${f.money(m.energyUnitPrice, cur, 4)}/kWh` : '—'],
    [t('metric.allInCost'), m.allInCostPerKwh !== null ? `${f.money(m.allInCostPerKwh, cur, 4)}/kWh` : '—'],
    [t('metric.subscription30'), m.subscriptionPer30Days !== null ? f.money(m.subscriptionPer30Days, cur) : '—'],
    [t('metric.annualisedCost'), `${f.money(m.annualisedCost, cur, 0)}`, 'metric.annualisedNote'],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/app/bills" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        {t('bills.title')}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{t(`energy.${d.energyType}`)} · {f.period(d.periodStart, d.periodEnd)}</p>
          <h1 className="font-display text-2xl font-bold">{d.supplier ?? t('bill.unknownSupplier')}</h1>
          {d.contractName && <p className="text-sm text-muted">{d.contractName}</p>}
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-extrabold tabular-nums">{f.money(d.totalAmount, cur)}</p>
          <p className="text-sm text-muted">{f.energy(d.consumption, d.consumptionUnit, 0)}</p>
          <div className="mt-1 flex justify-end gap-1">
            {isDemo ? <DemoBadge /> : <QualityBadge quality="user_confirmed" />}
            {!isDemo && <QualityBadge quality={d.readingType === 'actual' ? 'measured' : 'estimated'} />}
          </div>
        </div>
      </div>

      <Card>
        <SectionTitle>{t('bill.explainTitle')}</SectionTitle>
        <p className="text-sm leading-relaxed text-muted">
          {t('bill.explain', {
            days: m.days,
            consumption: f.energy(d.consumption, d.consumptionUnit, 0),
            total: f.money(d.totalAmount, cur),
            daily: f.money(m.dailyCost, cur),
            dailyConsumption: f.energy(m.dailyConsumption, d.consumptionUnit, 1),
          })}{' '}
          {m.energyUnitPrice !== null && m.allInCostPerKwh !== null &&
            t('bill.explainPrice', { energy: f.money(m.energyUnitPrice, cur, 4), allIn: f.money(m.allInCostPerKwh, cur, 4) })}
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>{t('bill.findingsTitle')}</SectionTitle>
          <div className="space-y-3">
            {[...attention, ...others].map((x, i) => (
              <FindingCard key={i} finding={x} />
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle>
              <span className="inline-flex items-center gap-2">
                {t('bill.metricsTitle')} <QualityBadge quality="calculated" />
              </span>
            </SectionTitle>
            <dl className="divide-y divide-line text-sm">
              {rows.map(([k, v, note]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted">
                    {k}
                    {note && <span className="block text-[11px]">{t(note)}</span>}
                  </dt>
                  <dd className="font-medium tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <SectionTitle>{t('bill.breakdownTitle')}</SectionTitle>
            {d.lines.length === 0 ? (
              <p className="text-sm text-muted">{t('dashboard.noBreakdown')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted">
                    <tr>
                      <th className="py-2 font-medium">{t('line.label')}</th>
                      <th className="py-2 font-medium">{t('line.calc')}</th>
                      <th className="py-2 text-right font-medium">{t('line.amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {d.lines.map((l, i) => {
                      const check = analysis.lineChecks.find((c) => c.index === i);
                      return (
                        <tr key={i}>
                          <td className="py-2">
                            {l.label}
                            <span className="block text-[11px] text-muted">{t(`category.${l.category}`)}</span>
                          </td>
                          <td className="py-2 text-xs text-muted tabular-nums">
                            {l.quantity !== null && l.unitPrice !== null
                              ? `${f.number(l.quantity, 3)} ${l.quantityUnit ?? ''} × ${f.money(l.unitPrice, cur, 4)} = ${f.money(l.quantity * l.unitPrice, cur)}`
                              : '—'}
                            {check && !check.ok && <span className="block text-warn">{t('line.mismatch')}</span>}
                          </td>
                          <td className="py-2 text-right tabular-nums">{l.amount !== null ? f.money(l.amount, cur) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="text-sm">
                    {analysis.breakdown.linesTotal !== null && (
                      <tr className="border-t border-line">
                        <td className="py-2 text-muted" colSpan={2}>{t('bill.linesTotal')}</td>
                        <td className="py-2 text-right tabular-nums">{f.money(analysis.breakdown.linesTotal, cur)}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-2 font-semibold" colSpan={2}>{t('field.totalAmount')}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{f.money(d.totalAmount, cur)}</td>
                    </tr>
                    {analysis.breakdown.unexplainedDifference !== null && analysis.breakdown.unexplainedDifference !== 0 && (
                      <tr>
                        <td className="py-1 text-xs text-muted" colSpan={2}>{t('bill.unexplained')}</td>
                        <td className="py-1 text-right text-xs tabular-nums text-muted">{f.money(analysis.breakdown.unexplainedDifference, cur)}</td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            )}
            {Object.keys(analysis.breakdown.byCategory).length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2 text-xs">
                {(Object.entries(analysis.breakdown.byCategory) as Array<[LineCategory, number]>).map(([k, v]) => (
                  <li key={k} className="rounded-full bg-surface-2 px-3 py-1">
                    {t(`category.${k}`)}: <span className="tabular-nums">{f.money(v, cur)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex justify-end">
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-3 text-sm">
            <span>{t('bill.deleteConfirm')}</span>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" loading={deleting} onClick={remove}>
              {t('bill.delete')}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" aria-hidden />
            {t('bill.delete')}
          </Button>
        )}
      </div>
    </div>
  );
}
