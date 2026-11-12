'use client';

import React, { useState } from 'react';
import Icon, { IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/formatters';
import { useAppTheme } from '@/theme/ThemeProvider';

export type ChartTone = 'sun' | 'violet' | 'green' | 'terracotta' | 'coral';

export const CHART_COLORS: Record<ChartTone, string> = {
  sun: '#FFDA38',
  violet: '#7357B1',
  green: '#356C58',
  terracotta: '#A95837',
  coral: '#E87F69',
};

const barToneClasses: Record<ChartTone, string> = {
  sun: 'bg-sun',
  violet: 'bg-violet',
  green: 'bg-green',
  terracotta: 'bg-terracotta',
  coral: 'bg-coral',
};

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
  tone?: ChartTone;
}> = ({ data, caption, unit = '', sort = true, emptyLabel, tone = 'sun' }) => {
  const { language, t } = useAppTheme();
  const [active, setActive] = useState<string | null>(null);
  const rows = sort ? [...data].sort((a, b) => b.value - a.value) : data;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);

  if (rows.length === 0) {
    return (
      <p className="rounded-[16px] bg-surface-elevated px-4 py-5 text-center text-caption text-fg-muted">
        {emptyLabel || t('Aucune donnée.', 'No data.')}
      </p>
    );
  }

  return (
    <figure className="m-0">
      <ul className="flex flex-col gap-1" aria-hidden>
        {rows.map((row) => {
          const pct = total ? Math.round((row.value / total) * 100) : 0;
          const isActive = active === row.label;
          return (
            <li
              key={row.label}
              className={cn(
                'group relative grid grid-cols-[minmax(84px,30%)_1fr_auto] items-center gap-3 rounded-[16px] px-2.5 py-2 transition-colors',
                isActive && 'bg-surface-elevated'
              )}
              onMouseEnter={() => setActive(row.label)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="truncate text-caption font-medium text-fg-secondary" title={row.label}>
                {row.label}
              </span>
              <span className="relative h-3.5 rounded-full bg-surface-elevated group-hover:bg-surface">
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full transition-[width,opacity] duration-500',
                    barToneClasses[tone],
                    isActive ? 'opacity-100' : 'opacity-90'
                  )}
                  style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
                />
              </span>
              <span className="min-w-12 text-right text-caption font-bold tabular">
                {formatNumber(row.value, language)}
                {unit}
              </span>
              {isActive ? (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute -top-9 left-[30%] z-10 rounded-[12px] bg-primary px-3 py-1.5 text-caption text-on-primary shadow-[0_8px_24px_rgba(29,38,55,0.16)]"
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
  tone?: ChartTone;
}> = ({ percentage, label, sublabel, size = 148, tone = 'sun' }) => {
  const clamped = Math.max(0, Math.min(100, Number(percentage || 0)));
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-3" role="img" aria-label={`${label} : ${Math.round(clamped)}%`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-elevated)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={CHART_COLORS[tone]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(clamped / 100) * c} ${c}`}
            className="transition-[stroke-dasharray] duration-700"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-hero font-bold tracking-[-0.4px] tabular"
          aria-hidden
        >
          {Math.round(clamped)}%
        </span>
      </div>
      <div className="text-center">
        <p className="text-body font-bold">{label}</p>
        {sublabel ? <p className="text-caption text-fg-muted">{sublabel}</p> : null}
      </div>
    </div>
  );
};

export type KpiAccent = 'sun' | 'lavender' | 'mint' | 'peach';

const accentBadgeClasses: Record<KpiAccent, string> = {
  sun: 'bg-sun-chip text-on-sun dark:text-sun',
  lavender: 'bg-lavender text-violet',
  mint: 'bg-mint text-green',
  peach: 'bg-peach text-terracotta',
};

export const KpiTile: React.FC<{
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'primary' | 'secondary';
  icon?: IconName;
  accent?: KpiAccent;
  className?: string;
}> = ({ label, value, hint, tone = 'default', icon, accent, className }) => {
  const highlighted = tone === 'primary';
  const badgeAccent: KpiAccent = accent ?? (tone === 'secondary' ? 'lavender' : 'sun');
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-[24px] p-4 md:p-[18px]',
        highlighted ? 'bg-sun text-on-sun' : 'card',
        className
      )}
    >
      {icon ? (
        <span
          aria-hidden
          className={cn(
            'mb-2 flex h-10 w-10 items-center justify-center rounded-full',
            highlighted ? 'bg-white/60 text-on-sun' : accentBadgeClasses[badgeAccent]
          )}
        >
          <Icon name={icon} size={20} />
        </span>
      ) : null}
      <p
        className={cn(
          'text-title font-bold tracking-[-0.4px] tabular',
          tone === 'secondary' && 'text-violet'
        )}
      >
        {value}
      </p>
      <p className={cn('text-caption font-medium', highlighted ? 'text-on-sun-muted' : 'text-fg-muted')}>{label}</p>
      {hint ? (
        <p className={cn('text-caption', highlighted ? 'text-on-sun-muted' : 'text-fg-secondary')}>{hint}</p>
      ) : null}
    </div>
  );
};
