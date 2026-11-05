'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  display: string;
}

const COLORS = ['var(--ww-accent)', 'var(--ww-blue)', 'var(--ww-violet)', 'var(--ww-warn)', '#4fd1e8', '#e56fb5', 'var(--ww-muted)'];

export function CostDonut({ slices, center, centerSub }: { slices: DonutSlice[]; center: string; centerSub: string }) {
  const positive = slices.filter((s) => s.value > 0);
  const total = positive.reduce((a, s) => a + s.value, 0);
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
      <div className="relative mx-auto size-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={positive} dataKey="value" nameKey="label" innerRadius="70%" outerRadius="100%" paddingAngle={2} stroke="none" isAnimationActive>
              {positive.map((s, i) => (
                <Cell key={s.key} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-lg font-bold">{center}</p>
            <p className="text-[11px] text-muted">{centerSub}</p>
          </div>
        </div>
      </div>
      <ul className="grid gap-2 text-sm">
        {positive.map((s, i) => (
          <li key={s.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} aria-hidden />
              {s.label}
            </span>
            <span className="tabular-nums text-muted">
              {s.display} · {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
