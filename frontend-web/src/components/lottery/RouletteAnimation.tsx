'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { shortenWallet } from '@/lib/formatters';
import { useAppTheme } from '@/theme/ThemeProvider';

export const RouletteAnimation: React.FC<{
  spinning: boolean;
  winnerWallet?: string | null;
  vrfRequestId?: string | null;
  certified?: boolean;
  drawRequested?: boolean;
}> = ({ spinning, winnerWallet, vrfRequestId, certified = true, drawRequested = false }) => {
  const { t } = useAppTheme();
  return (
    <section className="card mb-3.5 flex flex-col items-center p-5 md:p-8">
      <div
        aria-hidden
        className={cn(
          'mb-3.5 flex h-[132px] w-[132px] items-center justify-center rounded-full border-[3px] bg-surface-elevated md:h-[168px] md:w-[168px]',
          spinning ? 'border-secondary border-t-transparent animate-bl-spin' : 'border-primary'
        )}
      >
        <div
          className={cn(
            'flex h-[90px] w-[90px] items-center justify-center rounded-full border border-line bg-surface p-2 md:h-[116px] md:w-[116px]',
            spinning && '[animation:bl-spin_1.6s_linear_infinite_reverse]'
          )}
        >
          <span className="text-caption font-bold">{spinning ? t('Tirage...', 'Drawing...') : certified ? 'VRF' : t('Démo', 'Demo')}</span>
        </div>
      </div>

      <div className="text-center" aria-live="polite">
        <p className="text-body font-bold">
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
            <span className="font-mono">
              {vrfRequestId ? shortenWallet(vrfRequestId, 6) : t('Vérifiable sur contrat', 'Verifiable on-chain')}
            </span>
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default RouletteAnimation;
