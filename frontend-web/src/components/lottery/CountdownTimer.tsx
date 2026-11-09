'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Misc';
import { formatRemainingTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import { useAppTheme } from '@/theme/ThemeProvider';

export interface CountdownTimerProps {
  targetTime?: string;
  initialSeconds: number;
  prizePoolEth: number;
  roundNumber: number;
  className?: string;
}

const secondsUntil = (target?: string, fallback = 0): number => {
  if (!target) return fallback;
  const ms = new Date(target).getTime() - Date.now();
  return Number.isNaN(ms) ? fallback : Math.max(0, Math.floor(ms / 1000));
};

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetTime,
  initialSeconds,
  prizePoolEth,
  roundNumber,
  className,
}) => {
  const { t } = useAppTheme();
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    const tick = () =>
      setSecondsLeft((prev) => (targetTime ? secondsUntil(targetTime, prev) : Math.max(0, prev - 1)));
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetTime]);

  const { hours, minutes, seconds } = formatRemainingTime(secondsLeft);

  return (
    <section className={cn('card p-[18px] md:p-6', className)} aria-label={t('Tirage municipal', 'City draw')}>
      <div className="mb-3.5 flex items-center justify-between">
        <p className="text-caption font-medium text-fg-secondary">
          {t(`Tirage municipal #${roundNumber}`, `City Draw #${roundNumber}`)}
        </p>
        <Badge tone="primary">Chainlink VRF</Badge>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-caption text-fg-muted">{t('Cagnotte actuelle', 'Current Prize Pool')}</p>
          <p className="text-hero font-bold tabular md:text-display">
            {Number(prizePoolEth || 0).toFixed(2)} ETH
          </p>
          <p className="text-caption text-fg-muted">
            {t('Ethers fictifs · sans valeur monétaire', 'Test ethers · no monetary value')}
          </p>
        </div>

        <div className="flex flex-col items-end rounded-md bg-surface-elevated px-3 py-2">
          <p className="text-caption text-fg-secondary">{t('Échéance', 'Time Left')}</p>
          <p className="text-subtitle font-bold text-secondary tabular md:text-heading" aria-live="off">
            <time dateTime={`PT${hours}H${minutes}M${seconds}S`}>
              {hours}h {minutes}m {seconds}s
            </time>
          </p>
        </div>
      </div>
    </section>
  );
};

export default CountdownTimer;
