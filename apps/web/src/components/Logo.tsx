export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#0b1630" />
      <path d="M18.5 4.5 8.5 18h6l-1.5 9.5L23.5 14h-6l1-9.5Z" fill="#2ee6a6" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-lg font-extrabold tracking-tight">
        WATT<span className="text-accent-text">WISE</span>
      </span>
    </span>
  );
}
