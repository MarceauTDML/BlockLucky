'use client';

import Link from 'next/link';
import React from 'react';
import CountdownTimer from '@/components/lottery/CountdownTimer';
import DemoModeBadge from '@/components/lottery/DemoModeBadge';
import LeaderboardList from '@/components/lottery/LeaderboardList';
import NetworkPill from '@/components/lottery/NetworkPill';
import WinnerClaimCard from '@/components/lottery/WinnerClaimCard';
import Button, { LinkButton } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';
import { Loader } from '@/components/ui/Loader';
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
      <div className="mb-5 flex flex-col gap-1.5 md:mb-7">
        <p className="inline-flex items-center gap-1.5 text-caption font-medium text-fg-muted">
          <Icon name="location" size={16} />
          {t('Bonjour', 'Hello')}
          {user?.email ? ` ${user.email.split('@')[0]}` : ''}
        </p>
        <h1 className="text-title font-bold tracking-[-0.4px] md:text-hero">
          {t('Grand tirage de fin d’année', 'Year-end grand draw')}
        </h1>
      </div>

      {isLoading && !status ? (
        <Loader message={t('Synchronisation avec le Smart Contract...', 'Syncing with Smart Contract...')} skeletonRows={3} />
      ) : isError && !status ? (
        <Card tone="peach" padding="lg" className="flex flex-col gap-3">
          <p className="text-subtitle font-bold text-fg">
            {t(
              'Oups, réseau instable : impossible de joindre le Smart Contract. Réessayez dans quelques instants.',
              'Oops, unstable network: unable to reach the Smart Contract. Please retry shortly.'
            )}
          </p>
          <div className="max-w-xs">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              {t('Réessayer', 'Retry')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:gap-5">
          <div className="flex flex-col gap-4">
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
            >
              {!isOpen || isPaused ? (
                <div role="status" className="rounded-[16px] bg-surface/70 px-4 py-3 text-caption font-semibold text-on-sun">
                  {isPaused
                    ? t(
                        'Les participations sont temporairement suspendues par la Mairie (sécurité). Vos tickets restent valides.',
                        'Entries are temporarily paused by City Hall (security). Your tickets remain valid.'
                      )
                    : t(
                        'Les participations sont fermées pour ce tirage. Consultez le résultat dans la salle de tirage.',
                        'Entries are closed for this draw. Check the result in the live draw room.'
                      )}
                </div>
              ) : null}
              <Button variant="secondary" onClick={handleQuickBuy} loading={isBuying} disabled={!isOpen || isPaused}>
                <Icon name="ticket" size={20} />
                <span className="flex-1 text-left">{t('Acheter 1 ticket', 'Buy 1 ticket')}</span>
                <Icon name="arrowRight" size={18} />
              </Button>
              <LinkButton href="/tirage" variant="outline">
                <Icon name="clock" size={20} />
                <span className="flex-1 text-left">{t('Salle de tirage', 'Live Draw Room')}</span>
                <Icon name="arrowRight" size={18} />
              </LinkButton>
              <p className="text-center text-caption font-medium text-on-sun-muted">
                {t(
                  '1 ticket = 0,01 ETH fictif + frais réseau, payés par votre portefeuille BlockLucky intégré · aucune somme réelle engagée',
                  '1 ticket = 0.01 test ETH + network fees, paid by your integrated BlockLucky wallet · no real money involved'
                )}
              </p>
            </CountdownTimer>

            <Card tone="mint" padding="lg" className="flex items-start gap-3.5 rounded-[22px]">
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-green">
                <Icon name="shield" size={20} />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-subtitle font-bold text-fg">
                  {t('Garantie Smart Contract', 'Smart Contract Guarantee')}
                </p>
                <p className="text-caption text-fg-secondary">
                  {t(
                    status?.guarantees.autoRefundPolicy ||
                      'Remboursement automatique intégral si le tirage est annulé.',
                    'Automatic 100% refund guaranteed if the draw is cancelled.'
                  )}
                </p>
              </div>
            </Card>

            <Link
              href="/billetterie?mode=cadeau"
              className="card flex items-center gap-3.5 p-4 transition-colors hover:bg-surface-elevated"
            >
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun-soft text-on-sun">
                <Icon name="giftTicket" size={20} />
              </span>
              <span className="flex-1 text-body font-semibold text-fg">{t('Offrir un ticket', 'Gift a ticket')}</span>
              <Icon name="chevronRight" size={18} className="text-fg-muted" />
            </Link>
          </div>

          <div className="flex flex-col gap-4">
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
