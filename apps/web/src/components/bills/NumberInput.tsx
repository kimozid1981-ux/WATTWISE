'use client';

import { useEffect, useState } from 'react';
import { inputClass, cx } from '../ui';

/** Parses "1 234,56" or "1234.56". Returns undefined for invalid text, null for empty. */
export function parseDecimal(text: string): number | null | undefined {
  const s = text.trim().replace(/[\s  ]/g, '');
  if (s === '') return null;
  // The last separator is the decimal one: "1.234,56" → 1234.56, "1,234.56" → 1234.56, "0,25" → 0.25.
  const normalised =
    s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = Number(normalised);
  return Number.isFinite(n) ? n : undefined;
}

export function NumberInput({
  id,
  value,
  onChange,
  invalid,
  className,
  ariaLabel,
  placeholder,
}: {
  id?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  invalid?: boolean;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));
  const [bad, setBad] = useState(false);

  useEffect(() => {
    const parsed = parseDecimal(text);
    if (parsed !== value) setText(value === null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      aria-invalid={invalid || bad}
      placeholder={placeholder}
      className={cx(inputClass, 'tabular-nums', className)}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const parsed = parseDecimal(e.target.value);
        setBad(parsed === undefined);
        if (parsed !== undefined) onChange(parsed);
      }}
    />
  );
}
