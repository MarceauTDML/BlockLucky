'use client';

import React from 'react';
import CountdownTimer from '@/components/lottery/CountdownTimer';
import DemoModeBadge from '@/components/lottery/DemoModeBadge';
import LeaderboardList from '@/components/lottery/LeaderboardList';
import NetworkPill from '@/components/lottery/NetworkPill';
import WinnerClaimCard from '@/components/lottery/WinnerClaimCard';
import Button, { LinkButton } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { Alert } from '@/components/ui/Misc';
import ProgressBar from '@/components/ui/ProgressBar';
import useAuth from '@/hooks/useAuth';
import useBlockLuckyWallet from '@/hooks/useBlockLuckyWallet';
import { useGetLeaderboardQuery, useGetLotteryStatusQuery } from '@/store/api/lotteryApi';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function HomePage() {
  const { t } = useAppTheme();
  const { user } = useAuth();
  const { purchaseTicket, isBuying } = useBlockLuckyWallet();
  const { data: statusRes, isLoading, isError, refetch } = useGetLotteryStatusQuery(undefined, {
    pollingInterval: 30000,
  });
  const { data: leaderboardRes } = useGetLeaderboardQuery();

  const status = statusRes?.data;
  const leaderboard = Array.isArray(leaderboardRes?.data?.leaderboard) ? leaderboardRes.data.leaderboard : [];
  const isOpen = !status || status.round.status === 'OPEN';
  const isPaused = Boolean(status?.network?.isPaused);
  const simulated = Boolean(status?.guarantees?.simulated);

  const handleQuickBuy = async () => {
    await purchaseTicket(1, 0);
    refetch();
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-1 md:mb-6">
        <p className="text-caption font-medium text-secondary">
          {t('Bonjour', 'Hello')}
          {user?.email ? ` ${user.email.split('@')[0]}` : ''}
        </p>
        <h1 className="text-title font-bold md:text-hero">{t('Grand tirage de fin d’année', 'Year-end grand draw')}</h1>
      </div>

      {isLoading && !status ? (
        <Loader message={t('Synchronisation avec le Smart Contract...', 'Syncing with Smart Contract...')} skeletonRows={3} />
      ) : isError && !status ? (
        <Alert tone="error">
          {t(
            'Oups, réseau instable : impossible de joindre le Smart Contract. Réessayez dans quelques instants.',
            'Oops, unstable network: unable to reach the Smart Contract. Please retry shortly.'
          )}
          <div className="mt-3 max-w-xs">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t('Réessayer', 'Retry')}
            </Button>
          </div>
        </Alert>
      ) : (
        <div className="grid gap-3.5 lg:grid-cols-[1.25fr_1fr] lg:gap-5">
          <div className="flex flex-col gap-3.5">
            <WinnerClaimCard status={status} />
            <div className="flex flex-wrap items-center gap-2">
              <NetworkPill network={status?.network} />
              <DemoModeBadge simulated={simulated} />
            </div>
            <CountdownTimer
              targetTime={status?.round.drawTargetTime}
              initialSeconds={status?.round.remainingSeconds ?? 86400}
              prizePoolEth={status?.round.prizePool ?? 0}
              roundNumber={status?.round.contractRoundId ?? 1}
              simulated={simulated}
            />

            <Card padding="sm" className="flex flex-col gap-1">
              <p className="text-caption font-semibold text-primary">
                {t('Garantie Smart Contract', 'Smart Contract Guarantee')}
              </p>
              <p className="text-caption text-fg-secondary">
                {t(
                  status?.guarantees.autoRefundPolicy ||
                    'Remboursement automatique intégral si le tirage est annulé.',
                  'Automatic 100% refund guaranteed if the draw is cancelled.'
                )}
              </p>
            </Card>

            {!isOpen || isPaused ? (
              <Alert tone="warning">
                {isPaused
                  ? t(
                      'Les participations sont temporairement suspendues par la Mairie (sécurité). Vos tickets restent valides.',
                      'Entries are temporarily paused by City Hall (security). Your tickets remain valid.'
                    )
                  : t(
                      'Les participations sont fermées pour ce tirage. Consultez le résultat dans la salle de tirage.',
                      'Entries are closed for this draw. Check the result in the live draw room.'
                    )}
              </Alert>
            ) : null}

            <div className="flex flex-col gap-2.5">
              <Button onClick={handleQuickBuy} loading={isBuying} disabled={!isOpen || isPaused}>
                {t('Acheter 1 ticket', 'Buy 1 ticket')}
              </Button>
              <div className="flex gap-2.5">
                <LinkButton href="/billetterie?mode=cadeau" variant="secondary" className="flex-1">
                  {t('Offrir un ticket', 'Gift a ticket')}
                </LinkButton>
                <LinkButton href="/tirage" variant="outline" className="flex-1">
                  {t('Salle de tirage', 'Live Draw Room')}
                </LinkButton>
              </div>
              <p className="text-center text-caption text-fg-muted">
                {t(
                  '1 ticket = 0,01 ETH fictif + frais réseau, payés par votre portefeuille BlockLucky intégré · aucune somme réelle engagée',
                  '1 ticket = 0.01 test ETH + network fees, paid by your integrated BlockLucky wallet · no real money involved'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <ProgressBar
              percentage={status?.progression.percentage ?? 0}
              currentValue={status?.progression.ticketsSold ?? 0}
              targetValue={status?.progression.targetParticipants ?? 10000}
              milestones={status?.progression.milestones ?? []}
            />
            <LeaderboardList entries={leaderboard} />
          </div>
        </div>
      )}
    </div>
  );
}
