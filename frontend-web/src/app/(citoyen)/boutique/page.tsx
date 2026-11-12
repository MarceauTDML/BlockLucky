'use client';

import React, { useMemo, useState } from 'react';
import PointsBalanceCard from '@/components/marketplace/PointsBalanceCard';
import RewardCard from '@/components/marketplace/RewardCard';
import { Loader } from '@/components/ui/Loader';
import { Alert, EmptyState, PageHeader } from '@/components/ui/Misc';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import usePoints from '@/hooks/usePoints';
import { useGetCatalogQuery } from '@/store/api/marketplaceApi';
import { useAppTheme } from '@/theme/ThemeProvider';

type Filter = 'ALL' | 'AFFORDABLE';

export default function CatalogPage() {
  const { t } = useAppTheme();
  const { pointsBalance, ledgerIntegrityValid } = usePoints();
  const { data, isLoading, isError } = useGetCatalogQuery();
  const [filter, setFilter] = useState<Filter>('ALL');

  const rewards = useMemo(() => {
    const all = Array.isArray(data?.data?.catalog) ? data.data.catalog : [];
    return filter === 'AFFORDABLE' ? all.filter((r) => r.costInPoints <= pointsBalance && r.remainingStock > 0) : all;
  }, [data, filter, pointsBalance]);

  return (
    <div>
      <PageHeader
        title={t('Commerces partenaires', 'Partner Merchants')}
        subtitle={t(
          "Échangez vos points contre des cartes à gratter chez les commerçants d'EtherBay.",
          'Redeem your points for virtual scratch cards at EtherBay partner shops.'
        )}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr] lg:items-start lg:gap-5">
        <div className="lg:sticky lg:top-24">
          <PointsBalanceCard
            pointsBalance={pointsBalance}
            ledgerIntegrityValid={ledgerIntegrityValid}
            myCodesHref="/boutique/mes-codes"
          />
          <SegmentedTabs<Filter>
            ariaLabel={t('Filtrer les offres', 'Filter offers')}
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'ALL', label: t('Toutes les offres', 'All offers') },
              { value: 'AFFORDABLE', label: t('À ma portée', 'Within reach') },
            ]}
          />
        </div>

        <div>
          {isLoading ? (
            <Loader message={t('Chargement des offres partenaires...', 'Loading partner offers...')} skeletonRows={3} />
          ) : isError ? (
            <Alert tone="error">{t('Le catalogue est momentanément indisponible.', 'The catalog is temporarily unavailable.')}</Alert>
          ) : rewards.length === 0 ? (
            <EmptyState
              title={t('Aucune offre disponible', 'No offers available')}
              description={
                filter === 'AFFORDABLE'
                  ? t(
                      'Participez au tirage ou complétez des missions pour gagner des points.',
                      'Enter the draw or complete quests to earn points.'
                    )
                  : t(
                      'De nouveaux partenaires rejoignent le programme chaque semaine.',
                      'New local partners join the program every week.'
                    )
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {rewards.map((reward) => (
                <li key={reward.id}>
                  <RewardCard reward={reward} href={`/boutique/${reward.id}`} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
