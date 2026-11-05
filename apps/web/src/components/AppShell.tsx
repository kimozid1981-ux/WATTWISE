'use client';

import { FileText, Home, Lightbulb, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useApp } from './AppProvider';
import { Logo } from './Logo';
import { Spinner, cx } from './ui';

const NAV = [
  { href: '/app', key: 'nav.home', icon: Home },
  { href: '/app/bills', key: 'nav.bills', icon: FileText },
  { href: '/app/insights', key: 'nav.insights', icon: Lightbulb },
  { href: '/app/profile', key: 'nav.profile', icon: User },
] as const;

/** Signed-in area: sidebar on desktop, bottom tab bar on mobile. */
export function AppShell({ children }: { children: ReactNode }) {
  const { status, profile, t, mode, bills } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'signed_out') router.replace('/signin');
    else if (status === 'ready' && !profile) router.replace('/onboarding');
  }, [status, profile, router]);

  if (status !== 'ready' || !profile) return <Spinner label={t('common.loading')} />;

  const isActive = (href: string) => (href === '/app' ? pathname === '/app' : pathname.startsWith(href));
  const hasDemo = bills.some((b) => b.origin === 'demo');

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line bg-surface/60 p-6 md:flex">
        <Link href="/app" aria-label="WATTWISE">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-1" aria-label={t('nav.main')}>
          {NAV.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={cx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                isActive(href) ? 'bg-accent/12 font-semibold text-accent-text' : 'text-muted hover:bg-surface-2 hover:text-ink',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 text-xs text-muted">
          {mode === 'local' && <ModeBadge />}
          <p>{t('common.independent')}</p>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/85 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/app" aria-label="WATTWISE">
            <Logo />
          </Link>
          {mode === 'local' && <ModeBadge />}
        </header>
        {hasDemo && (
          <div className="border-b border-demo/30 bg-demo/10 px-4 py-2 text-center text-xs font-medium text-demo">
            {t('demo.banner')}
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 md:px-8 md:pb-10">{children}</main>
      </div>

      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-full border border-line bg-surface/95 p-1.5 shadow-2xl backdrop-blur md:hidden"
      >
        {NAV.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={cx(
              'flex flex-col items-center gap-0.5 rounded-full py-2 text-[11px] transition',
              isActive(href) ? 'bg-accent/15 font-semibold text-accent-text' : 'text-muted',
            )}
          >
            <Icon className="size-5" aria-hidden />
            {t(key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function ModeBadge() {
  const { t } = useApp();
  return (
    <span
      title={t('mode.localHint')}
      className="inline-flex items-center gap-1.5 rounded-full border border-warn/40 bg-warn/10 px-2.5 py-1 text-[11px] font-semibold text-warn"
    >
      <span className="size-1.5 rounded-full bg-warn" aria-hidden />
      {t('mode.local')}
    </span>
  );
}
