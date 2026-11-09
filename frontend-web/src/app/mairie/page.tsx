'use client';

import React from 'react';
import { KpiTile } from '@/components/charts/Charts';
import NetworkPill from '@/components/lottery/NetworkPill';
import Button, { LinkButton } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Alert, Badge, PageHeader } from '@/components/ui/Misc';
import ProgressBar from '@/components/ui/ProgressBar';
import { TARGET_PARTICIPANTS } from '@/lib/config';
import { formatDateShort } from '@/lib/date';
import { formatNumber, shortenWallet } from '@/lib/formatters';
import { useGetAdminDashboardQuery } from '@/store/api/adminApi';
import { useGetLotteryStatusQuery } from '@/store/api/lotteryApi';
import { useAppTheme } from '@/theme/ThemeProvider';

const STATUS_TONE = { OPEN: 'primary', LOCKED: 'warning', COMPLETED: 'neutral', CANCELLED: 'danger' } as const;

export default function MairieDashboardPage() {
  const { t, language } = useAppTheme();
  const { data, isLoading, isError, refetch, isFetching } = useGetAdminDashboardQuery(undefined, {
    pollingInterval: 60000,
  });
  const { data: statusRes } = useGetLotteryStatusQuery(undefined, { pollingInterval: 60000 });
  const dash = data?.data;
  const progression = statusRes?.data?.progression;
  const statusLabel: Record<string, string> = {
    OPEN: t('Ouvert', 'Open'),
    LOCKED: t('Verrouillé', 'Locked'),
    COMPLETED: t('Tiré', 'Drawn'),
    CANCELLED: t('Annulé', 'Cancelled'),
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("Ville d'EtherBay", 'City of EtherBay')}
        title={t('Pilotage de la loterie', 'Lottery overview')}
        subtitle={t(
          'Indicateurs consolidés du pilote. Montants exprimés en ethers fictifs.',
          'Consolidated pilot indicators. Amounts in test ethers.'
        )}
        actions={
          <>
            <Button variant="outline" size="sm" fullWidth={false} onClick={() => refetch()} loading={isFetching}>
              {t('Actualiser', 'Refresh')}
            </Button>
            <LinkButton href="/mairie/analytique" size="sm" fullWidth={false}>
              {t('Exporter un rapport', 'Export a report')}
            </LinkButton>
          </>
        }
      />

      {isLoading ? (
        <Loader message={t('Chargement des indicateurs…', 'Loading indicators…')} skeletonRows={4} />
      ) : isError || !dash ? (
        <Alert tone="error">
          {t(
            'Impossible de charger le tableau de bord. Vérifiez que le backend est démarré.',
            'Unable to load the dashboard. Make sure the backend is running.'
          )}
        </Alert>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <NetworkPill network={dash.network} />
            {dash.network.isPaused ? (
              <LinkButton href="/mairie/securite" variant="danger" size="sm" fullWidth={false}>
                {t('Circuit breaker actif — gérer', 'Circuit breaker on — manage')}
              </LinkButton>
            ) : null}
          </div>

          <section aria-label={t('Indicateurs clés', 'Key indicators')} className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <KpiTile
              label={t('Cagnotte totale', 'Total prize pool')}
              value={`${dash.kpis.totalPrizePoolEth.toFixed(2)} ETH`}
              hint={t('Tous tirages confondus', 'All draws combined')}
              tone="primary"
            />
            <KpiTile label={t('Tickets vendus', 'Tickets sold')} value={formatNumber(dash.kpis.ticketsSold, language)} />
            <KpiTile
              label={t('Part Mairie (10 %)', 'City share (10%)')}
              value={`${dash.kpis.municipalityRevenueEth.toFixed(3)} ETH`}
              hint={t('Revenus annexes fictifs', 'Test revenue')}
              tone="secondary"
            />
            <KpiTile
              label={t('Comptes inscrits', 'Registered accounts')}
              value={formatNumber(dash.kpis.registeredCitizens, language)}
            />
            <KpiTile label={t('Partenaires', 'Partners')} value={formatNumber(dash.kpis.activePartners, language)} />
            <KpiTile
              label={t('Récompenses réclamées', 'Rewards claimed')}
              value={formatNumber(dash.kpis.claimedRewards, language)}
            />
          </section>

          <ProgressBar
            title={t('Objectif du brief : 10 000 participants', 'Brief goal: 10,000 participants')}
            percentage={progression?.percentage ?? (dash.kpis.registeredCitizens / TARGET_PARTICIPANTS) * 100}
            currentValue={progression?.distinctParticipants ?? dash.kpis.registeredCitizens}
            targetValue={progression?.targetParticipants ?? TARGET_PARTICIPANTS}
            milestones={progression?.milestones ?? []}
          />

          <section className="card overflow-hidden" aria-labelledby="rounds-title">
            <div className="flex items-center justify-between p-4 pb-2">
              <h2 id="rounds-title" className="text-body font-bold">
                {t('Historique des tirages', 'Draw history')}
              </h2>
              <LinkButton href="/mairie/securite" variant="ghost" size="sm" fullWidth={false}>
                {t('Lancer / annuler un tirage', 'Run / cancel a draw')}
              </LinkButton>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-small">
                <thead className="border-y border-line bg-surface-elevated text-caption text-fg-secondary">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">#</th>
                    <th scope="col" className="px-4 py-2 font-medium">{t('Statut', 'Status')}</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">{t('Cagnotte', 'Prize pool')}</th>
                    <th scope="col" className="px-4 py-2 font-medium">{t('Gagnant', 'Winner')}</th>
                    <th scope="col" className="px-4 py-2 font-medium">{t('Ouverture', 'Opened')}</th>
                    <th scope="col" className="px-4 py-2 font-medium">{t('Tirage', 'Drawn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {dash.rounds.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-caption text-fg-muted">
                        {t('Aucun tirage enregistré.', 'No draw recorded.')}
                      </td>
                    </tr>
                  ) : (
                    dash.rounds.map((r) => (
                      <tr key={r.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-2.5 font-semibold tabular">{r.contractRoundId}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={STATUS_TONE[r.status]}>{statusLabel[r.status] || r.status}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular">{r.prizePool.toFixed(2)} ETH</td>
                        <td className="px-4 py-2.5 font-mono text-caption">
                          {r.winnerWallet ? shortenWallet(r.winnerWallet, 4) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-caption text-fg-secondary">{formatDateShort(r.startedAt)}</td>
                        <td className="px-4 py-2.5 text-caption text-fg-secondary">
                          {r.drawnAt ? formatDateShort(r.drawnAt) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
