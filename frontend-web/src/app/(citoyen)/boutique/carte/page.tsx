'use client';

import React from 'react';
import ScratchCanvas from '@/components/marketplace/ScratchCanvas';
import BackButton from '@/components/ui/BackButton';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState, PageHeader } from '@/components/ui/Misc';
import useIsClient from '@/hooks/useIsClient';
import storage, { KEYS } from '@/lib/storage';
import { useAppTheme } from '@/theme/ThemeProvider';
import { ClaimedRewardCode } from '@/types/api.types';

export default function ScratchCardPage() {
  const { t } = useAppTheme();
  const isClient = useIsClient();
  const claim = isClient ? storage.getJson<ClaimedRewardCode>(KEYS.lastClaim) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton href="/boutique" />
      <PageHeader
        title={t('Carte à gratter', 'Scratch Card')}
        subtitle={t(
          'Grattez la zone ci-dessous avec la souris ou le doigt pour révéler votre code promotionnel.',
          'Scratch the area below with your mouse or finger to reveal your promo code.'
        )}
      />
      {!isClient ? null : claim ? (
        <>
          <ScratchCanvas
            secretCode={claim.uniqueCode}
            partnerName={claim.partnerName || claim.partner?.name || t('Partenaire EtherBay', 'EtherBay Partner')}
            rewardTitle={claim.rewardTitle}
          />
          <div className="mt-4">
            <LinkButton href="/boutique/mes-codes">{t('Voir mes codes enregistrés', 'View My Saved Codes')}</LinkButton>
          </div>
        </>
      ) : (
        <EmptyState
          title={t('Aucune carte à gratter', 'No scratch card')}
          description={t(
            'Vos codes déjà révélés restent disponibles dans « Mes codes ».',
            'Codes you already revealed remain in “My codes”.'
          )}
          action={<LinkButton href="/boutique/mes-codes">{t('Mes codes', 'My codes')}</LinkButton>}
        />
      )}
    </div>
  );
}
