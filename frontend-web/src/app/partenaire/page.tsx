'use client';

import React from 'react';
import { KpiTile, RingMeter } from '@/components/charts/Charts';
import { PartnerSwitcher, usePartnerSelection } from '@/components/partner/PartnerSelection';
import { LinkButton } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Alert, Badge, EmptyState, PageHeader } from '@/components/ui/Misc';
import { useGetPartnerConsumptionQuery } from '@/store/api/partnersApi';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function PartnerDashboardPage() {
  const { t } = useAppTheme();
  const { selected, selectedId, isLoading: partnersLoading, partners } = usePartnerSelection();
  const { data, isLoading, isError } = useGetPartnerConsumptionQuery(selectedId ?? '', { skip: !selectedId });
  const c = data?.data;

  return (
    <div>
      <PageHeader
        eyebrow={selected?.name}
        title={t('Tableau de bord partenaire', 'Partner dashboard')}
        subtitle={t(
          'Suivez la consommation de vos offres par les habitants d’EtherBay.',
          'Track how EtherBay residents use your offers.'
        )}
        actions={<PartnerSwitcher />}
      />

      {partnersLoading ? (
        <Loader skeletonRows={3} />
      ) : partners.length === 0 ? (
        <EmptyState
          title={t('Aucun établissement', 'No business yet')}
          description={t(
            'Créez votre fiche commerce pour publier votre première offre.',
            'Create your business profile to publish your first offer.'
          )}
          action={<LinkButton href="/partenaire/offres">{t('Créer mon établissement', 'Create my business')}</LinkButton>}
        />
      ) : isLoading ? (
        <Loader skeletonRows={3} />
      ) : isError || !c ? (
        <Alert tone="error">{t('Statistiques indisponibles.', 'Statistics unavailable.')}</Alert>
      ) : (
        <div className="flex flex-col gap-5">
          {!c.partner.isActive ? (
            <Alert tone="warning">
              {t(
                'Votre établissement est suspendu par la Mairie : vos offres ne sont pas visibles des habitants.',
                'Your business is suspended by City Hall: your offers are hidden from residents.'
              )}
            </Alert>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <section className="card flex flex-col items-center justify-center p-6">
              <RingMeter
                percentage={c.summary.consumptionPercentage}
                label={t('Codes réclamés', 'Codes claimed')}
                sublabel={t(
                  `${c.summary.claimedCount} sur ${c.summary.totalStock} émis`,
                  `${c.summary.claimedCount} of ${c.summary.totalStock} issued`
                )}
              />
            </section>
            <section className="grid grid-cols-2 gap-3 self-start">
              <KpiTile
                label={t('Codes émis', 'Codes issued')}
                value={String(c.summary.totalStock)}
                icon="giftTicket"
                accent="sun"
              />
              <KpiTile
                label={t('Stock restant', 'Remaining stock')}
                value={String(c.summary.remainingStock)}
                icon="bag"
                accent="peach"
              />
              <KpiTile
                label={t('Réclamés en ligne', 'Claimed online')}
                value={String(c.summary.claimedCount)}
                tone="primary"
                icon="star"
              />
              <KpiTile
                label={t('Utilisés en magasin', 'Redeemed in store')}
                value={String(c.summary.redeemedInStoreCount)}
                tone="secondary"
                icon="check"
              />
            </section>
          </div>

          <section className="card overflow-hidden p-2 md:p-3" aria-labelledby="offers-title">
            <div className="flex items-center justify-between gap-3 px-2.5 pb-2 pt-2.5">
              <h2 id="offers-title" className="text-subtitle font-bold">
                {t('Détail par offre', 'Breakdown by offer')}
              </h2>
              <LinkButton href="/partenaire/offres" size="sm" fullWidth={false}>
                {t('Nouvelle offre', 'New offer')}
              </LinkButton>
            </div>
            {c.offersBreakdown.length === 0 ? (
              <p className="m-2.5 rounded-[16px] bg-surface-elevated px-4 py-5 text-center text-caption text-fg-muted">
                {t('Aucune offre publiée.', 'No offer published.')}
              </p>
            ) : (
              <ul>
                {c.offersBreakdown.map((o) => (
                  <li
                    key={o.rewardId}
                    className="flex flex-col gap-2 rounded-[16px] border-t border-line px-3 py-3.5 transition-colors first:border-t-0 hover:bg-surface-elevated"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-body font-semibold">{o.title}</p>
                      <Badge tone="secondary">{o.costInPoints} pts</Badge>
                    </div>
                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-surface-elevated"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={o.consumptionRatePercent}
                      aria-label={t(`Consommation de ${o.title}`, `Consumption of ${o.title}`)}
                    >
                      <div className="h-full rounded-full bg-sun" style={{ width: `${Math.max(2, o.consumptionRatePercent)}%` }} />
                    </div>
                    <p className="text-caption text-fg-secondary tabular">
                      {t(
                        `${o.claimedCount} réclamés · ${o.redeemedInStoreCount} utilisés · ${o.remainingStock}/${o.totalStock} restants · ${o.consumptionRatePercent} %`,
                        `${o.claimedCount} claimed · ${o.redeemedInStoreCount} redeemed · ${o.remainingStock}/${o.totalStock} left · ${o.consumptionRatePercent}%`
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
