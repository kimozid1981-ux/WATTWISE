'use client';

import { BarChart3, FileSearch, Globe2, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { LanguageSelect } from '@/components/LanguageSelect';
import { Logo } from '@/components/Logo';
import { ButtonLink } from '@/components/ui';

export default function Landing() {
  const { t, status } = useApp();
  const ctaHref = status === 'ready' ? '/app' : '/signin';

  const features = [
    { icon: BarChart3, title: t('landing.f1.title'), body: t('landing.f1.body') },
    { icon: FileSearch, title: t('landing.f2.title'), body: t('landing.f2.body') },
    { icon: Sparkles, title: t('landing.f3.title'), body: t('landing.f3.body') },
    { icon: Globe2, title: t('landing.f4.title'), body: t('landing.f4.body') },
  ];
  const principles = [t('landing.p1'), t('landing.p2'), t('landing.p3'), t('landing.p4')];

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <LanguageSelect compact />
          <ButtonLink href={ctaHref} variant="secondary" className="hidden sm:inline-flex">
            {status === 'ready' ? t('landing.openApp') : t('auth.signIn')}
          </ButtonLink>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_10%,color-mix(in_oklab,var(--ww-accent)_18%,transparent),transparent_70%),radial-gradient(40%_40%_at_10%_30%,color-mix(in_oklab,var(--ww-blue)_18%,transparent),transparent_70%)]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:pt-20">
            <div className="space-y-6 fade-in">
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs text-muted">
                <ShieldCheck className="size-3.5 text-accent-text" aria-hidden />
                {t('landing.badge')}
              </p>
              <h1 className="font-display text-4xl leading-[1.05] font-extrabold tracking-tight md:text-6xl">
                {t('landing.title1')} <span className="text-accent-text">{t('landing.title2')}</span>
              </h1>
              <p className="max-w-xl text-lg text-muted">{t('landing.subtitle')}</p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={ctaHref} className="px-7">
                  {t('landing.cta')}
                </ButtonLink>
                <ButtonLink href="#how" variant="secondary">
                  {t('landing.how')}
                </ButtonLink>
              </div>
              <p className="text-xs text-muted">{t('landing.countries')}</p>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card p-5">
                <div className="mb-4 grid size-10 place-items-center rounded-xl bg-accent/12 text-accent-text">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h2 className="font-display font-semibold">{title}</h2>
                <p className="mt-2 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 md:px-8">
          <div className="card grid gap-8 p-8 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <Lock className="mb-3 size-6 text-accent-text" aria-hidden />
              <h2 className="font-display text-2xl font-bold">{t('landing.trustTitle')}</h2>
              <p className="mt-2 text-sm text-muted">{t('landing.trustBody')}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {principles.map((p) => (
                <li key={p} className="rounded-2xl border border-line bg-surface-2 p-4 text-sm">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-muted md:px-8">
          <span>© {new Date().getFullYear()} WATTWISE · {t('common.independent')}</span>
          <nav className="flex gap-4">
            <Link href="/privacy" className="hover:text-ink">
              {t('legal.privacy')}
            </Link>
            <Link href="/terms" className="hover:text-ink">
              {t('legal.terms')}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** Illustrative product preview, explicitly labelled as an example. */
function HeroPreview() {
  const { t } = useApp();
  const bars = [62, 48, 36, 30, 28, 33, 45, 58, 70, 60, 42, 32];
  return (
    <div className="card relative p-5 fade-in" aria-label={t('landing.previewLabel')}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">{t('dashboard.monthlyTitle')}</p>
        <span className="rounded-md bg-demo/20 px-2 py-0.5 text-[11px] font-bold tracking-widest text-demo">
          {t('landing.example')}
        </span>
      </div>
      <div className="flex h-40 items-end gap-1.5">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-gradient-to-t from-accent/30 to-accent"
            style={{ height: `${h + 20}%` }}
          />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="text-xs text-muted">{t('dashboard.annualEstimate')}</p>
          <p className="font-display text-xl font-bold">— €</p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="text-xs text-muted">{t('dashboard.vsPrevious')}</p>
          <p className="font-display text-xl font-bold text-accent-text">—</p>
        </div>
      </div>
    </div>
  );
}
