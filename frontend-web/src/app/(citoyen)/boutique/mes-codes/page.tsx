'use client';

import React from 'react';
import BackButton from '@/components/ui/BackButton';
import { LinkButton } from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
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
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {codes.map((item) => (
            <li key={item.id} className={cn('card flex flex-col gap-2.5 p-5', item.isUsed && 'opacity-70')}>
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex min-w-0 items-center gap-2 eyebrow-caps text-caption font-bold text-fg-muted">
                  <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sun-soft text-on-sun">
                    <Icon name="bag" size={16} />
                  </span>
                  {item.partner?.name || item.partnerName || t('Commerçant EtherBay', 'EtherBay Partner')}
                </p>
                <p
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold',
                    item.isUsed ? 'bg-surface-elevated text-fg-muted' : 'bg-mint text-green'
                  )}
                >
                  {item.isUsed ? t('Utilisé', 'Used') : t('Actif', 'Active')}
                </p>
              </div>
              <h2 className="my-0.5 text-subtitle font-bold">{item.rewardTitle}</h2>

              <div className="my-1 flex flex-col items-center gap-2 rounded-[20px] border-2 border-dashed border-line bg-sun-chip p-4">
                {item.qrCodeDataUrl && !item.isUsed ? (
                  <img
                    src={item.qrCodeDataUrl}
                    alt={t(`QR code du code ${item.uniqueCode}`, `QR code for ${item.uniqueCode}`)}
                    width={132}
                    height={132}
                    className="rounded-[12px] bg-white p-2"
                  />
                ) : null}
                <p className="eyebrow-caps text-caption font-bold text-fg-secondary">{t('Code magasin', 'In-Store Code')}</p>
                <p className="font-mono text-title font-bold text-fg">{item.uniqueCode}</p>
              </div>

              <p className="inline-flex items-center gap-1.5 text-caption text-fg-muted">
                <Icon name="clock" size={14} />
                {t(`Obtenu le ${formatDateShort(item.claimedAt)}`, `Claimed on ${formatDateShort(item.claimedAt)}`)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
