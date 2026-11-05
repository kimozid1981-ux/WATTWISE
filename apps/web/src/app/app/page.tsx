'use client';

import {
  analyseBill,
  getCountry,
  summariseEnergy,
  type EnergyType,
  type LineCategory,
} from '@wattwise/core';
import { ArrowDownRight, ArrowUpRight, FileUp, FlaskConical, Lightbulb, Zap } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { FindingCard } from '@/components/bills/FindingCard';
import { CostDonut } from '@/components/charts/CostDonut';
import { MonthlyBars } from '@/components/charts/MonthlyBars';
import { UsageGauge } from '@/components/charts/UsageGauge';
import { Button, ButtonLink, Card, DemoBadge, EmptyState, Notice, QualityBadge, SectionTitle, Spinner, cx } from '@/components/ui';
import { countryName, type MessageKey } from '@/i18n';
import { loadDemoData } from '@/lib/demo';
import { useFormat } from '@/lib/useFormat';

export default function DashboardPage() {
  const { t, profile, bills, billsLoading, store, refreshBills, language, error } = useApp();
  const f = useFormat();
  const [energy, setEnergy] = useState<EnergyType>('electricity');
  const [metric, setMetric] = useState<'kwh' | 'cost'>('kwh');
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const available = useMemo(
    () => (['electricity', 'gas'] as EnergyType[]).filter((e) => bills.some((b) => b.data.energyType === e)),
    [bills],
  );
  const activeEnergy = available.includes(energy) ? energy : (available[0] ?? 'electricity');
  const summary = useMemo(() => summariseEnergy(bills, activeEnergy), [bills, activeEnergy]);
  const latestAnalysis = useMemo(() => {
    const latest = summary && bills.find((b) => b.id === summary.latestBillId);
    return latest ? analyseBill(latest, bills) : null;
  }, [summary, bills]);

  if (!profile) return null;
  const country = getCountry(profile.country);

  if (billsLoading && bills.length === 0) return <Spinner label={t('common.loading')} />;

  const header = (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm text-muted">{t('dashboard.greeting', { name: profile.household.name })}</p>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('dashboard.title')}</h1>
      </div>
      <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
        {countryName(country.code, language)} · {country.currency}
      </span>
    </div>
  );

  if (error) return (<>{header}<Notice tone="error" title={t('common.loadError')}>{error}</Notice></>);

  if (!summary) {
    const loadDemo = async () => {
      if (!store) return;
      setDemoBusy(true);
      setDemoError(null);
      try {
        await loadDemoData(store, profile);
        await refreshBills();
      } catch (e) {
        setDemoError(e instanceof Error ? e.message : String(e));
      } finally {
        setDemoBusy(false);
      }
    };
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={<Zap className="size-6" aria-hidden />}
            title={t('dashboard.emptyTitle')}
            body={t('dashboard.emptyBody')}
            action={
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/app/bills/new">
                  <FileUp className="size-4" aria-hidden />
                  {t('bills.add')}
                </ButtonLink>
                <Button variant="secondary" onClick={loadDemo} loading={demoBusy}>
                  <FlaskConical className="size-4" aria-hidden />
                  {t('dashboard.loadDemo')}
                </Button>
              </div>
            }
          />
          {demoError && <Notice tone="error">{demoError}</Notice>}
        </Card>
      </>
    );
  }

  const unit = summary.latest.unit;
  const monthlyDailyMax = Math.max(
    summary.latest.dailyConsumption,
    ...summary.monthly.map((m) => (m.kwh !== null && unit === 'kWh' ? m.kwh / m.daysInMonth : 0)),
  );
  const gaugeMax = Math.ceil((monthlyDailyMax * 1.15) / 5) * 5 || 10;
  const sourceQuality = summary.isDemo ? 'demo' : 'estimated';
  const change = summary.comparison?.dailyCostChangePct ?? null;

  const latestBill = bills.find((b) => b.id === summary.latestBillId)!;
  const byCat = latestAnalysis?.breakdown.byCategory ?? {};
  const slices = (Object.entries(byCat) as Array<[LineCategory, number]>)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ key: k, label: t(`category.${k}` as MessageKey), value: v, display: f.money(v, summary.currency) }));
  const topFindings = (latestAnalysis?.findings ?? []).filter((x) => x.severity !== 'info').slice(0, 3);

  return (
    <>
      {header}

      {available.length > 1 && (
        <div className="mb-4 inline-flex rounded-full border border-line bg-surface p-1" role="tablist">
          {available.map((e) => (
            <button
              key={e}
              role="tab"
              aria-selected={activeEnergy === e}
              onClick={() => setEnergy(e)}
              className={cx('rounded-full px-4 py-1.5 text-sm', activeEnergy === e ? 'bg-accent text-accent-ink font-semibold' : 'text-muted')}
            >
              {t(`energy.${e}`)}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-display font-semibold">{t('dashboard.dailyAverage')}</h2>
            {summary.isDemo ? <DemoBadge /> : <QualityBadge quality={sourceQuality} />}
          </div>
          <UsageGauge
            value={summary.latest.dailyConsumption}
            max={gaugeMax}
            centerLabel={f.energy(summary.latest.dailyConsumption, unit)}
            centerSub={t('dashboard.perDay')}
            minLabel={f.energy(0, unit, 0)}
            maxLabel={f.energy(gaugeMax, unit, 0)}
            ariaLabel={t('dashboard.gaugeAria', { value: f.energy(summary.latest.dailyConsumption, unit) })}
          />
          <div className="mt-4 grid grid-cols-2 divide-x divide-line rounded-2xl bg-surface-2 py-3 text-center">
            <div>
              <p className="text-xs text-muted">{t('dashboard.costPerDay')}</p>
              <p className="font-display text-xl font-bold">{f.money(summary.latest.dailyCost, summary.currency)}</p>
              {change !== null && <Trend pct={change} label={t('dashboard.vsPrevious')} />}
            </div>
            <div>
              <p className="text-xs text-muted">{t('dashboard.weekly')}</p>
              <p className="font-display text-xl font-bold">{f.energy(summary.latest.weeklyConsumption, unit, 0)}</p>
              <p className="text-[11px] text-muted">≈ {f.money(summary.latest.weeklyCost, summary.currency)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            {t('dashboard.sourceLine', {
              period: f.period(summary.latestPeriod.start, summary.latestPeriod.end),
              reading: t(`quality.${summary.latest.readingQuality}`),
            })}
          </p>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Stat
            label={t('dashboard.latestBill')}
            value={f.money(summary.latest.cost, summary.currency)}
            sub={`${f.energy(summary.latest.consumption, unit, 0)} · ${f.period(summary.latestPeriod.start, summary.latestPeriod.end)}`}
            quality={summary.isDemo ? 'demo' : 'user_confirmed'}
          />
          <Stat
            label={t('dashboard.annualEstimate')}
            value={f.money(summary.annual.cost, summary.currency, 0)}
            sub={`${f.energy(summary.annual.consumption, unit, 0)} · ${t(summary.annual.method === 'last_12_months' ? 'dashboard.method12' : 'dashboard.methodAnnualised', { days: summary.annual.coveredDays })}`}
            quality={summary.annual.quality}
          />
          <Stat
            label={t('dashboard.vsPrevious')}
            value={summary.comparison?.dailyConsumptionChangePct != null ? f.percent(summary.comparison.dailyConsumptionChangePct) : '—'}
            sub={
              summary.comparison
                ? t('dashboard.vsPreviousSub', { period: f.period(summary.comparison.previousPeriod.start, summary.comparison.previousPeriod.end) })
                : t('dashboard.noPrevious')
            }
            quality={summary.isDemo ? 'demo' : 'calculated'}
          />
          <Stat
            label={t('dashboard.tariff')}
            value={summary.tariff.energyUnitPrice !== null ? `${f.money(summary.tariff.energyUnitPrice, summary.currency, 4)}/kWh` : summary.tariff.allInCostPerKwh !== null ? `${f.money(summary.tariff.allInCostPerKwh, summary.currency, 4)}/kWh*` : '—'}
            sub={[summary.tariff.supplier, summary.tariff.contractName].filter(Boolean).join(' · ') || t('dashboard.tariffUnknown')}
            quality={summary.isDemo ? 'demo' : 'user_confirmed'}
            footnote={summary.tariff.energyUnitPrice === null && summary.tariff.allInCostPerKwh !== null ? t('dashboard.allInNote') : undefined}
          />
        </div>
      </div>

      {summary.hasOverlappingBills && (
        <Notice tone="warn" className="mt-4">
          {t('dashboard.overlapWarning')}
        </Notice>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <SectionTitle
            action={
              <div className="inline-flex rounded-full bg-surface-2 p-1 text-xs" role="tablist">
                {(['kwh', 'cost'] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={metric === m}
                    onClick={() => setMetric(m)}
                    className={cx('rounded-full px-3 py-1', metric === m ? 'bg-accent text-accent-ink font-semibold' : 'text-muted')}
                  >
                    {m === 'kwh' ? unit.replace('m3', 'm³') : summary.currency}
                  </button>
                ))}
              </div>
            }
          >
            {t('dashboard.monthlyTitle')}
          </SectionTitle>
          <MonthlyBars
            data={summary.monthly}
            metric={metric}
            locale={f.locale}
            formatValue={(v) => (metric === 'kwh' ? f.energy(v, 'kWh', 0) : f.money(v, summary.currency))}
          />
          <p className="mt-2 flex items-center gap-2 text-xs text-muted">
            {summary.isDemo ? <DemoBadge /> : <QualityBadge quality="estimated" />}
            {t('dashboard.monthlyNote')}
          </p>
        </Card>

        <Card>
          <SectionTitle>{t('dashboard.breakdownTitle')}</SectionTitle>
          {slices.length > 0 ? (
            <CostDonut slices={slices} center={f.money(latestBill.data.totalAmount, summary.currency, 0)} centerSub={t('dashboard.latestBill')} />
          ) : (
            <p className="text-sm text-muted">{t('dashboard.noBreakdown')}</p>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <SectionTitle
          action={
            <Link href="/app/insights" className="text-sm text-accent-text hover:underline">
              {t('common.seeAll')}
            </Link>
          }
        >
          <span className="inline-flex items-center gap-2">
            <Lightbulb className="size-4 text-accent-text" aria-hidden />
            {t('dashboard.insightsTitle')}
          </span>
        </SectionTitle>
        {topFindings.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {topFindings.map((x, i) => (
              <FindingCard key={i} finding={x} compact />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">{t('dashboard.noInsights')}</p>
        )}
      </Card>
    </>
  );
}

function Trend({ pct, label }: { pct: number; label: string }) {
  const { percent } = useFormat();
  const up = pct > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={cx('inline-flex items-center gap-0.5 text-[11px]', up ? 'text-warn' : 'text-accent-text')}>
      <Icon className="size-3" aria-hidden />
      {percent(pct)} <span className="text-muted">{label}</span>
    </p>
  );
}

function Stat({
  label,
  value,
  sub,
  quality,
  footnote,
}: {
  label: string;
  value: string;
  sub: string;
  quality: 'demo' | 'estimated' | 'calculated' | 'user_confirmed' | 'measured';
  footnote?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        {quality === 'demo' ? <DemoBadge /> : <QualityBadge quality={quality} />}
      </div>
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
      {footnote && <p className="text-[11px] text-muted">{footnote}</p>}
    </Card>
  );
}
