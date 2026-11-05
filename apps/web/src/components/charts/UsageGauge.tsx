'use client';

/** Semicircle gauge (0 → max). Purely presentational; caller supplies labelled values. */
export function UsageGauge({
  value,
  max,
  centerLabel,
  centerSub,
  minLabel,
  maxLabel,
  ariaLabel,
}: {
  value: number;
  max: number;
  centerLabel: string;
  centerSub: string;
  minLabel: string;
  maxLabel: string;
  ariaLabel: string;
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const r = 80;
  const cx = 100;
  const cy = 100;
  const arcLen = Math.PI * r;
  const angle = Math.PI * (1 - ratio);
  const kx = cx + r * Math.cos(angle);
  const ky = cy - r * Math.sin(angle);
  return (
    <figure className="relative mx-auto w-full max-w-xs" role="img" aria-label={ariaLabel}>
      <svg viewBox="0 0 200 120" className="w-full">
        <defs>
          <linearGradient id="ww-gauge" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--ww-blue)" />
            <stop offset="100%" stopColor="var(--ww-accent)" />
          </linearGradient>
        </defs>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--ww-surface-3)" strokeWidth="14" strokeLinecap="round" />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="url(#ww-gauge)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${arcLen * ratio} ${arcLen}`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <circle cx={kx} cy={ky} r="9" fill="var(--ww-surface)" stroke="var(--ww-accent)" strokeWidth="3" />
      </svg>
      <figcaption className="absolute inset-x-0 top-[42%] text-center">
        <p className="font-display text-3xl font-extrabold tracking-tight">{centerLabel}</p>
        <p className="text-xs text-muted">{centerSub}</p>
      </figcaption>
      <div className="-mt-1 flex justify-between px-1 text-[11px] text-muted">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </figure>
  );
}
