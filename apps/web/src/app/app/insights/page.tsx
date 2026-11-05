'use client';

import { analyseBill, applianceCost, summariseEnergy, type EnergyType } from '@wattwise/core';
import { Calculator, Lightbulb, MessageCircle, Scale } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { FindingCard } from '@/components/bills/FindingCard';
import { NumberInput } from '@/components/bills/NumberInput';
import { ButtonLink, Card, EmptyState, Field, QualityBadge, SectionTitle } from '@/components/ui';
import { useFormat } from '@/lib/useFormat';

export default function InsightsPage() {
  const { t, bills } = useApp();
  const f = useFormat();

  const perEnergy = useMemo(
    () =>
      (['electricity', 'gas'] as EnergyType[]).flatMap((e) => {
        const s = summariseEnergy(bills, e);
        if (!s) return [];
        const latest = bills.find((b) => b.id === s.latestBillId)!;
        return [{ energy: e, summary: s, analysis: analyseBill(latest, bills) }];
      }),
    [bills],
  );

  const elec = perEnergy.find((p) => p.energy === 'electricity');
  const defaultPrice = elec?.summary.tariff.energyUnitPrice ?? elec?.summary.tariff.allInCostPerKwh ?? null;
  const [watts, setWatts] = useState<number | null>(2000);
  const [hours, setHours] = useState<number | null>(3);
  const [price, setPrice] = useState<number | null>(null);
  const effectivePrice = price ?? defaultPrice;
  const result =
    watts && hours && effectivePrice ? applianceCost({ watts, hours, pricePerKwh: effectivePrice }) : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">{t('insights.title')}</h1>
        <p className="text-sm text-muted">{t('insights.subtitle')}</p>
      </div>

      {perEnergy.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Lightbulb className="size-6" aria-hidden />}
            title={t('insights.emptyTitle')}
            body={t('insights.emptyBody')}
            action={<ButtonLink href="/app/bills/new">{t('bills.add')}</ButtonLink>}
          />
        </Card>
      ) : (
        perEnergy.map(({ energy, summary, analysis }) => (
          <Card key={energy}>
            <SectionTitle>
              {t(`energy.${energy}`)} · <span className="font-normal text-muted">{f.period(summary.latestPeriod.start, summary.latestPeriod.end)}</span>
            </SectionTitle>
            <div className="grid gap-3 md:grid-cols-2">
              {analysis.findings.map((x, i) => (
                <FindingCard key={i} finding={x} />
              ))}
            </div>
          </Card>
        ))
      )}

      <Card>
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <Calculator className="size-4 text-accent-text" aria-hidden />
            {t('calc.title')}
          </span>
        </SectionTitle>
        <p className="mb-4 text-sm text-muted">{t('calc.body')}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('calc.watts')} htmlFor="calc-w">
            <NumberInput id="calc-w" value={watts} onChange={setWatts} />
          </Field>
          <Field label={t('calc.hours')} htmlFor="calc-h">
            <NumberInput id="calc-h" value={hours} onChange={setHours} />
          </Field>
          <Field
            label={t('calc.price', { currency: f.currency })}
            htmlFor="calc-p"
            hint={price === null && defaultPrice !== null ? t('calc.priceFromBill') : t('calc.priceManual')}
          >
            <NumberInput id="calc-p" value={effectivePrice} onChange={setPrice} />
          </Field>
        </div>
        <div className="mt-4 rounded-2xl bg-surface-2 p-4" aria-live="polite">
          {result ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                {t('calc.result', {
                  kwh: f.energy(result.kwh, 'kWh', 2),
                  cost: f.money(result.cost),
                  month: f.money(result.cost * 30),
                })}
              </p>
              <QualityBadge quality="estimated" />
            </div>
          ) : (
            <p className="text-sm text-muted">{t('calc.missing')}</p>
          )}
          <p className="mt-2 text-xs text-muted">{t('calc.assumptions')}</p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="opacity-80">
          <div className="flex items-start gap-3">
            <Scale className="mt-0.5 size-5 text-muted" aria-hidden />
            <div>
              <p className="font-semibold">{t('insights.tariffSoonTitle')}</p>
              <p className="text-sm text-muted">{t('insights.tariffSoonBody')}</p>
            </div>
          </div>
        </Card>
        <Card className="opacity-80">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 size-5 text-muted" aria-hidden />
            <div>
              <p className="font-semibold">{t('insights.coachSoonTitle')}</p>
              <p className="text-sm text-muted">{t('insights.coachSoonBody')}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
