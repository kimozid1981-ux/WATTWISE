'use client';

import type { DataQuality } from '@wattwise/core';
import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { useApp } from './AppProvider';

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function Card({ className, children, ...rest }: ComponentProps<'section'>) {
  return (
    <section className={cx('card p-5 fade-in', className)} {...rest}>
      {children}
    </section>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 font-semibold',
  secondary: 'bg-surface-2 text-ink border border-line hover:bg-surface-3',
  ghost: 'text-ink hover:bg-surface-2',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
};

export function Button({
  variant = 'primary',
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm transition',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}

const QUALITY_STYLE: Record<DataQuality, string> = {
  measured: 'bg-accent/15 text-accent-text',
  user_confirmed: 'bg-blue/15 text-blue',
  calculated: 'bg-blue/15 text-blue',
  estimated: 'bg-warn/15 text-warn',
  demo: 'bg-demo/20 text-demo',
};

/** Every displayed figure shows its quality: measured, estimated, demo... */
export function QualityBadge({ quality, className }: { quality: DataQuality; className?: string }) {
  const { t } = useApp();
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        QUALITY_STYLE[quality],
        className,
      )}
    >
      {t(`quality.${quality}`)}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-demo/20 px-2 py-0.5 text-[11px] font-bold tracking-widest text-demo">
      DEMO
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'warn' | 'error' | 'success';
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'info' ? Info : AlertTriangle;
  const color =
    tone === 'error'
      ? 'border-danger/30 bg-danger/10 text-danger'
      : tone === 'warn'
        ? 'border-warn/30 bg-warn/10 text-warn'
        : tone === 'success'
          ? 'border-accent/30 bg-accent/10 text-accent-text'
          : 'border-blue/30 bg-blue/10 text-blue';
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className={cx('flex gap-3 rounded-2xl border p-4 text-sm', color, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-ink/85">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-accent-text">{icon}</div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-muted">{body}</p>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  'w-full min-h-11 rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none aria-[invalid=true]:border-danger';

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-base font-semibold">{children}</h2>
      {action}
    </div>
  );
}
