'use client';

import React from 'react';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { shortenWallet } from '@/lib/formatters';
import { useAppTheme } from '@/theme/ThemeProvider';

const WHEEL_SIZE = 260;
const WHEEL_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export const RouletteAnimation: React.FC<{
  spinning: boolean;
  winnerWallet?: string | null;
  vrfRequestId?: string | null;
  certified?: boolean;
  drawRequested?: boolean;
}> = ({ spinning, winnerWallet, vrfRequestId, certified = true, drawRequested = false }) => {
  const { t } = useAppTheme();
  return (
    <section className="card mb-3.5 flex flex-col items-center overflow-hidden p-5 md:p-8">
      <span
        className={cn(
          'mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-bold uppercase tracking-[0.2px]',
          spinning ? 'bg-[#1d2637] text-sun' : 'bg-sun-chip text-on-sun dark:text-sun'
        )}
      >
        <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', spinning ? 'bg-sun animate-bl-shimmer' : 'bg-sun')} />
        {spinning ? t('Tirage...', 'Drawing...') : certified ? 'Chainlink VRF' : t('Démo', 'Demo')}
      </span>
      <div aria-hidden className="relative mb-5" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE + 14 }}>
        <span className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[12px] border-t-[18px] border-x-transparent border-t-[#1d2637] dark:border-t-sun" />
        <div
          className={cn(
            'absolute left-0 rounded-full shadow-[0_14px_32px_rgba(172,141,10,0.22)]',
            spinning && 'animate-bl-spin'
          )}
          style={{ top: 14, width: WHEEL_SIZE, height: WHEEL_SIZE }}
        >
          <Icon name="wheel" size={WHEEL_SIZE} />
          {WHEEL_LABELS.map((label, index) => {
            const angle = ((-90 + 36 * index) * Math.PI) / 180;
            return (
              <span
                key={label}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-caption font-bold text-[#1d2637]"
                style={{ left: `${50 + 34 * Math.cos(angle)}%`, top: `${50 + 34 * Math.sin(angle)}%` }}
              >
                {label}
              </span>
            );
          })}
        </div>
        <div
          className="absolute left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#1d2637] text-caption font-bold text-sun"
          style={{ top: 14 + WHEEL_SIZE / 2 }}
        >
          {certified ? 'VRF' : t('Démo', 'Demo')}
        </div>
      </div>

      <div className="text-center" aria-live="polite">
        <p className={cn('font-bold', winnerWallet ? 'rounded-full bg-sun px-4 py-2 text-subtitle text-on-sun' : 'text-subtitle')}>
          {winnerWallet
            ? t(`Gagnant : ${shortenWallet(winnerWallet, 6)}`, `Winner: ${shortenWallet(winnerWallet, 6)}`)
            : spinning
              ? t('Sélection aléatoire en cours...', 'Random selection in progress...')
              : drawRequested
                ? certified
                  ? t(
                      'Tirage demandé à Chainlink VRF, le gagnant sera annoncé en direct',
                      'Draw requested from Chainlink VRF, the winner will be announced live'
                    )
                  : t('Tirage demandé, le gagnant sera annoncé en direct', 'Draw requested, the winner will be announced live')
                : certified
                  ? t('Tirage certifié en attente', 'Certified draw pending')
                  : t('Tirage en attente', 'Draw pending')}
        </p>
        {certified ? (
          <p className="mt-1 text-caption text-fg-secondary">
            {t('Preuve Chainlink : ', 'Chainlink Proof: ')}
            <span className="font-mono font-semibold text-fg">
              {vrfRequestId ? shortenWallet(vrfRequestId, 6) : t('Vérifiable sur contrat', 'Verifiable on-chain')}
            </span>
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default RouletteAnimation;
