'use client';

import { launchCountries, plannedCountries, type CountryCode } from '@wattwise/core';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { HouseholdFields } from '@/components/HouseholdFields';
import { LanguageSelect } from '@/components/LanguageSelect';
import { Logo } from '@/components/Logo';
import { Button, Notice, Spinner, cx } from '@/components/ui';
import { countryName } from '@/i18n';
import type { Household, Profile } from '@/lib/types';

const DEFAULT_HOUSEHOLD: Household = { name: '', occupants: 2, homeType: 'apartment', heating: 'unknown', hasGas: false };

export default function OnboardingPage() {
  const { t, status, profile, saveProfile, language, user } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState<CountryCode | null>(null);
  const [household, setHousehold] = useState<Household>(DEFAULT_HOUSEHOLD);
  const [consentData, setConsentData] = useState(false);
  const [consentAi, setConsentAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'signed_out') router.replace('/signin');
    if (status === 'ready' && profile) router.replace('/app');
  }, [status, profile, router]);

  if (status !== 'ready' || profile) return <Spinner label={t('common.loading')} />;

  const steps = [t('onboarding.stepCountry'), t('onboarding.stepHousehold'), t('onboarding.stepPrivacy')];

  const finish = async () => {
    if (!country || !consentData) return;
    setBusy(true);
    setError(null);
    const now = new Date().toISOString();
    const p: Profile = {
      displayName: user?.email ?? null,
      country,
      language,
      theme: 'dark',
      household: { ...household, name: household.name.trim() || t('onboarding.defaultHouseholdName') },
      consents: { dataProcessing: now, aiDocumentProcessing: consentAi ? now : null, keepOriginalDocuments: false },
      createdAt: now,
      updatedAt: now,
    };
    try {
      await saveProfile(p);
      router.replace('/app');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6">
      <header className="mb-8 flex items-center justify-between">
        <Logo />
        <LanguageSelect compact />
      </header>

      <ol className="mb-6 flex gap-2" aria-label={t('onboarding.progress')}>
        {steps.map((label, i) => (
          <li key={label} className="flex-1">
            <div className={cx('h-1.5 rounded-full', i <= step ? 'bg-accent' : 'bg-surface-3')} />
            <p className={cx('mt-2 text-xs', i === step ? 'font-semibold text-ink' : 'text-muted')} aria-current={i === step ? 'step' : undefined}>
              {label}
            </p>
          </li>
        ))}
      </ol>

      <div className="card space-y-6 p-6 fade-in">
        {step === 0 && (
          <>
            <div>
              <h1 className="font-display text-2xl font-bold">{t('onboarding.countryTitle')}</h1>
              <p className="mt-1 text-sm text-muted">{t('onboarding.countryBody')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t('onboarding.countryTitle')}>
              {launchCountries().map((c) => (
                <button
                  key={c.code}
                  role="radio"
                  aria-checked={country === c.code}
                  onClick={() => setCountry(c.code)}
                  className={cx(
                    'relative flex min-h-16 flex-col items-start justify-center rounded-2xl border p-4 text-left transition',
                    country === c.code ? 'border-accent bg-accent/10' : 'border-line bg-surface-2 hover:border-muted',
                  )}
                >
                  <span className="font-semibold">{countryName(c.code, language)}</span>
                  <span className="text-xs text-muted">{c.currency}</span>
                  {country === c.code && <Check className="absolute top-3 right-3 size-4 text-accent-text" aria-hidden />}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">
              {t('onboarding.comingSoon')}: {plannedCountries().map((c) => countryName(c.code, language)).join(', ')}
            </p>
            <div className="flex justify-end">
              <Button disabled={!country} onClick={() => setStep(1)}>
                {t('common.continue')}
              </Button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <h1 className="font-display text-2xl font-bold">{t('onboarding.householdTitle')}</h1>
              <p className="mt-1 text-sm text-muted">{t('onboarding.householdBody')}</p>
            </div>
            <HouseholdFields value={household} onChange={setHousehold} />
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>
                {t('common.back')}
              </Button>
              <Button onClick={() => setStep(2)}>{t('common.continue')}</Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h1 className="font-display text-2xl font-bold">{t('onboarding.privacyTitle')}</h1>
              <p className="mt-1 text-sm text-muted">{t('onboarding.privacyBody')}</p>
            </div>
            <label className="flex gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
              <input type="checkbox" className="mt-1 size-4 accent-[var(--ww-accent)]" checked={consentData} onChange={(e) => setConsentData(e.target.checked)} />
              <span>
                <span className="font-semibold">{t('consent.data.title')}</span> <span className="text-xs text-warn">({t('common.required')})</span>
                <span className="mt-1 block text-muted">{t('consent.data.body')}</span>
              </span>
            </label>
            <label className="flex gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
              <input type="checkbox" className="mt-1 size-4 accent-[var(--ww-accent)]" checked={consentAi} onChange={(e) => setConsentAi(e.target.checked)} />
              <span>
                <span className="font-semibold">{t('consent.ai.title')}</span> <span className="text-xs text-muted">({t('common.optional')})</span>
                <span className="mt-1 block text-muted">{t('consent.ai.body')}</span>
              </span>
            </label>
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                {t('common.back')}
              </Button>
              <Button disabled={!consentData} loading={busy} onClick={finish}>
                {t('onboarding.finish')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
