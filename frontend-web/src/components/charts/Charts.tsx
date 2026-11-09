'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/formatters';
import { useAppTheme } from '@/theme/ThemeProvider';

export interface BarDatum {
  label: string;
  value: number;
  hint?: string;
}

export const BarList: React.FC<{
  data: BarDatum[];
  caption: string;
  unit?: string;
  sort?: boolean;
  emptyLabel?: string;
}> = ({ data, caption, unit = '', sort = true, emptyLabel }) => {
  const { language, t } = useAppTheme();
  const [active, setActive] = useState<string | null>(null);
  const rows = sort ? [...data].sort((a, b) => b.value - a.value) : data;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);

  if (rows.length === 0) {
    return <p className="text-caption text-fg-muted">{emptyLabel || t('Aucune donnée.', 'No data.')}</p>;
  }

  return (
    <figure className="m-0">
      <ul className="flex flex-col gap-2.5" aria-hidden>
        {rows.map((row) => {
          const pct = total ? Math.round((row.value / total) * 100) : 0;
          const isActive = active === row.label;
          return (
            <li
              key={row.label}
              className="group relative grid grid-cols-[minmax(84px,30%)_1fr_auto] items-center gap-3"
              onMouseEnter={() => setActive(row.label)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="truncate text-caption text-fg-secondary" title={row.label}>
                {row.label}
              </span>
              <span className="relative h-3 rounded-full bg-surface-elevated">
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-500',
                    isActive ? 'bg-primary-light' : 'bg-primary'
                  )}
                  style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
                />
              </span>
              <span className="min-w-12 text-right text-caption font-semibold tabular">
                {formatNumber(row.value, language)}
                {unit}
              </span>
              {isActive ? (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute -top-9 left-[30%] z-10 rounded-md border border-line bg-surface px-2.5 py-1 text-caption shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                >
                  <span className="font-semibold">{row.label}</span> · {formatNumber(row.value, language)}
                  {unit} ({pct}%){row.hint ? ` · ${row.hint}` : ''}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>
                {row.value}
                {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};

export const RingMeter: React.FC<{
  percentage: number;
  label: string;
  sublabel?: string;
  size?: number;
}> = ({ percentage, label, sublabel, size = 148 }) => {
  const clamped = Math.max(0, Math.min(100, Number(percentage || 0)));
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label={`${label} : ${Math.round(clamped)}%`}>
      <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-elevated)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * c} ${c}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-hero font-bold tabular" aria-hidden>
        {Math.round(clamped)}%
      </span>
      </div>
      <div className="text-center">
        <p className="text-caption font-semibold">{label}</p>
        {sublabel ? <p className="text-caption text-fg-muted">{sublabel}</p> : null}
      </div>
    </div>
  );
};

export const KpiTile: React.FC<{
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'primary' | 'secondary';
}> = ({ label, value, hint, tone = 'default' }) => (
  <div className="card flex flex-col gap-1 p-4">
    <p className="text-caption text-fg-muted">{label}</p>
    <p
      className={cn(
        'text-title font-bold tabular',
        tone === 'primary' && 'text-primary',
        tone === 'secondary' && 'text-secondary'
      )}
    >
      {value}
    </p>
    {hint ? <p className="text-caption text-fg-secondary">{hint}</p> : null}
  </div>
);
