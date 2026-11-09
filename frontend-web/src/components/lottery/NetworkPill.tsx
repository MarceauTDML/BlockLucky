'use client';

import React from 'react';
import { StatusDot } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import { useAppTheme } from '@/theme/ThemeProvider';
import { LotteryStatusResponse } from '@/types/api.types';

export const NetworkPill: React.FC<{ network?: LotteryStatusResponse['network']; className?: string }> = ({
  network,
  className,
}) => {
  const { t } = useAppTheme();
  if (!network) return null;
  const isFallback = Boolean(network.isFallback ?? network.fallbackActive);
  const isPaused = Boolean(network.isPaused ?? network.circuitBreakerTripped);

  const label = isPaused
    ? t('Participations suspendues par la Mairie', 'Entries paused by City Hall')
    : isFallback
      ? t('Relais secondaire actif', 'Fallback node active')
      : network.latencyMs
        ? t(`Réseau Ethereum synchronisé (${network.latencyMs}ms)`, `Ethereum node synced (${network.latencyMs}ms)`)
        : t('Réseau Ethereum synchronisé', 'Ethereum node synced');

  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 self-start rounded-full border border-line bg-surface-elevated px-3 py-[5px] text-caption text-fg-secondary',
        className
      )}
    >
      <StatusDot tone={isPaused ? 'error' : isFallback ? 'warning' : 'success'} />
      {label}
    </p>
  );
};

export default NetworkPill;
