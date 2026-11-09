'use client';

import React from 'react';
import BackButton from '@/components/ui/BackButton';
import { LinkButton } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Alert, EmptyState, PageHeader } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import { formatDateShort } from '@/lib/date';
import { useGetMyCodesQuery } from '@/store/api/marketplaceApi';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function MyCodesPage() {
  const { t } = useAppTheme();
  const { data, isLoading, isError } = useGetMyCodesQuery();
  const codes = Array.isArray(data?.data?.codes) ? data.data.codes : [];

  return (
    <div>
      <BackButton href="/boutique" />
      <PageHeader
        title={t('Mes codes partenaires', 'My Partner Codes')}
        subtitle={t(
          "Présentez ces codes uniques chez les commerçants partenaires d'EtherBay.",
          'Present these unique promo codes at EtherBay partner stores.'
        )}
      />

      {isLoading ? (
        <Loader message={t('Chargement de vos codes...', 'Loading your codes...')} />
      ) : isError ? (
        <Alert tone="error">{t('Impossible de charger vos codes.', 'Unable to load your codes.')}</Alert>
      ) : codes.length === 0 ? (
        <EmptyState
          title={t('Aucun code enregistré', 'No saved codes')}
          description={t(
            'Échangez vos points dans le catalogue pour débloquer votre première carte à gratter.',
            'Redeem your points in the catalog to unlock your first scratch card.'
          )}
          action={<LinkButton href="/boutique">{t('Explorer le catalogue', 'Explore Catalog')}</LinkButton>}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {codes.map((item) => (
            <li key={item.id} className={cn('card flex flex-col gap-2 p-[18px]', item.isUsed && 'opacity-70')}>
              <div className="flex items-center justify-between">
                <p className="eyebrow-caps text-caption font-semibold text-secondary">
                  {item.partner?.name || item.partnerName || t('Commerçant EtherBay', 'EtherBay Partner')}
                </p>
                <p className={cn('text-caption font-semibold', item.isUsed ? 'text-fg-muted' : 'text-primary')}>
                  {item.isUsed ? t('Utilisé', 'Used') : t('Actif', 'Active')}
                </p>
              </div>
              <h2 className="my-0.5 text-subtitle font-semibold">{item.rewardTitle}</h2>

              <div className="my-1.5 flex flex-col items-center gap-2 rounded-md border border-line bg-surface-elevated p-4">
                {item.qrCodeDataUrl && !item.isUsed ? (
                  <img
                    src={item.qrCodeDataUrl}
                    alt={t(`QR code du code ${item.uniqueCode}`, `QR code for ${item.uniqueCode}`)}
                    width={132}
                    height={132}
                    className="rounded-sm bg-white p-1.5"
                  />
                ) : null}
                <p className="eyebrow-caps text-caption text-fg-secondary">{t('Code magasin', 'In-Store Code')}</p>
                <p className="font-mono text-title font-bold text-primary">{item.uniqueCode}</p>
              </div>

              <p className="text-caption text-fg-muted">
                {t(`Obtenu le ${formatDateShort(item.claimedAt)}`, `Claimed on ${formatDateShort(item.claimedAt)}`)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
