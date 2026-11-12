'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/formatters';
import { useAppTheme } from '@/theme/ThemeProvider';
import { Milestone } from '@/types/api.types';

export interface ProgressBarProps {
  percentage: number;
  currentValue: number;
  targetValue: number;
  milestones?: Milestone[];
  title?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  currentValue,
  targetValue,
  milestones = [],
  title,
  className,
}) => {
  const { t, language } = useAppTheme();
  const clamped = Math.max(2, Math.min(100, Number(percentage || 0)));
  const label = title || t('Participation citoyenne', 'Community Participation');

  return (
    <section className={cn('card p-4', className)} aria-label={label}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-body font-bold">{label}</h2>
        <span className="rounded-full bg-sun-chip px-2.5 py-1 text-caption font-bold text-on-sun tabular dark:text-sun">
          {formatNumber(currentValue, language)} / {formatNumber(targetValue || 10000, language)}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Number(percentage || 0))}
        aria-label={label}
        className="mb-3 h-3 w-full overflow-hidden rounded-full bg-surface-elevated"
      >
        <div
          className="h-full rounded-full bg-sun transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>

      {milestones.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {milestones.map((m) => (
            <li
              key={m.target}
              className={cn('flex items-center rounded-[16px] px-3 py-2.5', m.unlocked ? 'bg-sun-chip' : 'bg-surface-elevated')}
            >
              <span
                aria-hidden
                className={cn('mr-2.5 h-2.5 w-2.5 shrink-0 rounded-full', m.unlocked ? 'bg-sun' : 'bg-line')}
              />
              <span className="flex-1">
                <span className="block text-caption font-bold">
                  {m.title}
                  <span className="sr-only">
                    {m.unlocked ? t(' (débloqué)', ' (unlocked)') : t(' (verrouillé)', ' (locked)')}
                  </span>
                </span>
                <span className="block text-caption text-fg-secondary">{m.rewardDescription}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};

export default ProgressBar;
