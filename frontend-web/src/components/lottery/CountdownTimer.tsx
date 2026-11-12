'use client';

import React, { useEffect, useRef, useState } from 'react';
import SoundToggle from '@/components/lottery/SoundToggle';
import Icon from '@/components/ui/Icon';
import useSound, { CHRONO_SECONDS, SOUNDS } from '@/hooks/useSound';
import { formatRemainingTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import { useAppTheme } from '@/theme/ThemeProvider';

export interface CountdownTimerProps {
  targetTime?: string;
  initialSeconds: number;
  prizePoolEth: number;
  roundNumber: number;
  simulated?: boolean;
  sound?: boolean;
  className?: string;
  children?: React.ReactNode;
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
  simulated = false,
  sound = false,
  className,
  children,
}) => {
  const { t } = useAppTheme();
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    const tick = () =>
      setSecondsLeft((prev) => (targetTime ? secondsUntil(targetTime, prev) : Math.max(0, prev - 1)));
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetTime]);

  const { play: playChrono, stop: stopChrono } = useSound(SOUNDS.chrono);
  const chronoFor = useRef<string | null>(null);
  const finalCountdown = sound && secondsLeft > 0 && secondsLeft <= CHRONO_SECONDS;
  const countdownKey = `${roundNumber}-${targetTime ?? ''}`;

  useEffect(() => {
    if (!finalCountdown || chronoFor.current === countdownKey) return;
    chronoFor.current = countdownKey;
    playChrono();
  }, [finalCountdown, countdownKey, playChrono]);

  useEffect(() => {
    if (!sound) stopChrono();
  }, [sound, stopChrono]);

  const { hours, minutes, seconds } = formatRemainingTime(secondsLeft);

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[28px] bg-sun p-5 text-on-sun shadow-[0_14px_32px_rgba(172,141,10,0.22)] md:p-7',
        className
      )}
      aria-label={t('Tirage municipal', 'City draw')}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1d2637] px-3 py-1 text-caption font-semibold text-white">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sun" />
          {simulated ? t('Mode démonstration', 'Demo mode') : 'Chainlink VRF'}
        </span>
        <div className="flex items-center gap-2">
          <p className="text-caption font-semibold text-on-sun">
            {t(`Tirage municipal #${roundNumber}`, `City Draw #${roundNumber}`)}
          </p>
          {sound ? <SoundToggle /> : null}
        </div>
      </div>

      <p className="eyebrow-caps text-caption font-bold text-on-sun">{t('Cagnotte actuelle', 'Current Prize Pool')}</p>
      <p className="text-display font-bold tracking-[-1px] tabular md:text-[56px] md:leading-[64px]">
        {Number(prizePoolEth || 0).toFixed(2)} ETH
      </p>
      <p className="mb-4 text-caption font-medium text-on-sun-muted">
        {t('Ethers fictifs · sans valeur monétaire', 'Test ethers · no monetary value')}
      </p>

      <div className="flex items-center justify-between gap-3 rounded-[16px] bg-sun-soft px-4 py-2.5">
        <span className="inline-flex items-center gap-2 text-caption font-semibold text-on-sun">
          <Icon name="clock" size={16} />
          {t('Échéance', 'Time Left')}
        </span>
        <p className="text-heading font-bold text-on-sun tabular md:text-title" aria-live="off">
          <time dateTime={`PT${hours}H${minutes}M${seconds}S`}>
            {hours}h {minutes}m {seconds}s
          </time>
        </p>
      </div>
      {children ? <div className="mt-4 flex flex-col gap-2.5">{children}</div> : null}
    </section>
  );
};

export default CountdownTimer;
