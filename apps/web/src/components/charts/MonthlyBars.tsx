'use client';

import { formatMonth, type MonthlyPoint } from '@wattwise/core';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function MonthlyBars({
  data,
  metric,
  locale,
  formatValue,
}: {
  data: MonthlyPoint[];
  metric: 'kwh' | 'cost';
  locale: string;
  formatValue: (v: number) => string;
}) {
  const rows = data.slice(-12).map((p) => ({
    label: formatMonth(p.month, locale),
    value: metric === 'kwh' ? (p.kwh ?? 0) : p.cost,
    partial: p.coveredDays < p.daysInMonth,
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="ww-bar" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--ww-accent)" />
              <stop offset="100%" stopColor="var(--ww-accent)" stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--ww-border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--ww-muted)', fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: 'var(--ww-muted)', fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: 'var(--ww-surface-2)' }}
            contentStyle={{
              background: 'var(--ww-surface)',
              border: '1px solid var(--ww-border)',
              borderRadius: 12,
              color: 'var(--ww-text)',
              fontSize: 12,
            }}
            formatter={(v) => [formatValue(Number(v)), '']}
            separator=""
          />
          <Bar dataKey="value" fill="url(#ww-bar)" radius={[8, 8, 2, 2]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
