'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import ChatBox from '@/components/lottery/ChatBox';
import DemoModeBadge from '@/components/lottery/DemoModeBadge';
import RouletteAnimation from '@/components/lottery/RouletteAnimation';
import SoundToggle from '@/components/lottery/SoundToggle';
import WinnerClaimCard from '@/components/lottery/WinnerClaimCard';
import Button, { buttonClasses } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/Misc';
import Sheet from '@/components/ui/Sheet';
import useSocket from '@/hooks/useSocket';
import { trackEvent } from '@/lib/analytics';
import { useAppDispatch, useAppSelector } from '@/store';
import { useGetLotteryStatusQuery } from '@/store/api/lotteryApi';
import { setRouletteSpinning } from '@/store/slices/lotterySlice';
import { useAppTheme } from '@/theme/ThemeProvider';

const CANCEL_NOTICE_MS = 3 * 60 * 1000;

export default function LiveDrawPage() {
  const { t } = useAppTheme();
  const dispatch = useAppDispatch();
  const { data: statusRes, fulfilledTimeStamp } = useGetLotteryStatusQuery(undefined, { pollingInterval: 5000 });
  const status = statusRes?.data;
  const round = status?.round;
  const previousRound = status?.previousRound;
  const [dismissedCancel, setDismissedCancel] = useState<number | null>(null);
  const cancelledRecently =
    previousRound?.status === 'CANCELLED' &&
    fulfilledTimeStamp !== undefined &&
    fulfilledTimeStamp - new Date(previousRound.endedAt).getTime() < CANCEL_NOTICE_MS;
  const cancelNoticeOpen = Boolean(cancelledRecently && previousRound && dismissedCancel !== previousRound.contractRoundId);
  const closeCancelNotice = () => setDismissedCancel(previousRound?.contractRoundId ?? null);
  const guarantees = status?.guarantees;
  const simulated = Boolean(guarantees?.simulated);
  const certified = !guarantees || (guarantees.vrfCertified && !guarantees.simulated);
  const contractExplorerUrl = status?.blockchain?.lotteryExplorerUrl;
  const { sendChatMessage } = useSocket(round?.id);
  const { onlineWaitingUsers, liveChatMessages, lastWinnerAnnouncement, isRouletteSpinning, socketConnected } =
    useAppSelector((s) => s.lottery);

  const announcedWinner = lastWinnerAnnouncement?.winnerWallet || round?.winnerWallet;
  const winnerWallet = isRouletteSpinning ? null : announcedWinner;
  const proof = lastWinnerAnnouncement?.vrfProofHash || round?.chainlinkRequestId;
  const drawRequested = !announcedWinner && round?.status === 'LOCKED';

  useEffect(() => {
    if (winnerWallet) trackEvent('result_view', { source: 'live_draw' });
  }, [winnerWallet]);

  const handleSimulateSpin = () => {
    dispatch(setRouletteSpinning(true));
    window.setTimeout(() => dispatch(setRouletteSpinning(false)), 3500);
  };

  return (
    <div>
      <PageHeader
        title={t('Tirage en direct', 'Live Draw')}
        subtitle={
          certified
            ? t('Vérification aléatoire décentralisée via Chainlink VRF', 'Decentralized randomness verified by Chainlink VRF')
            : t(
                'Mode démonstration : le tirage est simulé par le serveur, sans certification Chainlink VRF.',
                'Demo mode: the draw is simulated by the server, without Chainlink VRF certification.'
              )
        }
        actions={
          <>
            <DemoModeBadge simulated={simulated} />
            <SoundToggle />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr] lg:gap-5">
        <div className="flex flex-col">
          <Card tone="lavender" padding="lg" className="mb-3.5 flex items-start gap-3.5">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-violet">
              <Icon name="users" size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-subtitle font-bold text-fg">{t("Salle d'attente", 'Waiting Room')}</p>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-caption font-semibold text-violet tabular">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
                {t(`${onlineWaitingUsers} en ligne`, `${onlineWaitingUsers} online`)}
              </p>
            </div>
            <p className="text-caption text-fg-secondary">
              {round?.inWaitingRoom
                ? certified
                  ? t(
                      'Les 10 dernières minutes sont actives. Le tirage Chainlink VRF est imminent.',
                      'The final 10-minute countdown is active. Chainlink VRF draw is imminent.'
                    )
                  : t(
                      'Les 10 dernières minutes sont actives. Le tirage est imminent.',
                      'The final 10-minute countdown is active. The draw is imminent.'
                    )
                : t(
                    "Ouverture du compte à rebours final 10 minutes avant l'échéance du contrat.",
                    'Final countdown opens 10 minutes before smart contract expiration.'
                  )}
            </p>
            </div>
          </Card>

          {isRouletteSpinning ? null : <WinnerClaimCard status={status} className="mb-3.5" />}

          <RouletteAnimation
            spinning={isRouletteSpinning}
            winnerWallet={winnerWallet}
            vrfRequestId={proof}
            certified={certified}
            drawRequested={drawRequested}
          />

          <Button variant="secondary" onClick={handleSimulateSpin} disabled={isRouletteSpinning}>
            <Icon name="wheel" size={20} />
            {isRouletteSpinning ? t('Tirage en cours...', 'Drawing...') : t('Simuler la roue de tirage', 'Simulate Draw Wheel')}
          </Button>

          <Card tone={certified ? 'mint' : 'peach'} padding="lg" className="mt-3.5 flex items-start gap-3.5 rounded-[22px]">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-green">
              <Icon name="shield" size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-subtitle font-bold text-fg">
              {certified
                ? t('Certification Chainlink VRF v2.5', 'Chainlink VRF v2.5 Certification')
                : t('Tirage de démonstration', 'Demo draw')}
            </p>
            <p className="text-caption text-fg-secondary">
              {certified
                ? t(
                    "La preuve cryptographique garantit l'impartialité complète de la sélection du portefeuille gagnant.",
                    'Cryptographic proof guarantees complete fairness when selecting the winning wallet.'
                  )
                : t(
                    "Ce tirage n'utilise pas d'oracle Chainlink VRF : aucune preuve cryptographique n'est publiée.",
                    'This draw does not use a Chainlink VRF oracle: no cryptographic proof is published.'
                  )}
            </p>
            {certified && proof ? (
              <p className="break-all rounded-[12px] bg-surface px-3 py-2 font-mono text-caption text-fg-secondary">
                {t('Preuve : ', 'Proof: ')}
                {proof}
              </p>
            ) : null}
            {contractExplorerUrl ? (
              <a
                href={contractExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-caption font-semibold text-green underline-offset-2 hover:underline"
              >
                {t("Voir le Smart Contract sur l'explorateur de blocs →", 'View the Smart Contract on the block explorer →')}
              </a>
            ) : null}
            </div>
          </Card>
        </div>

        <ChatBox
          messages={liveChatMessages}
          onSendMessage={sendChatMessage}
          connected={socketConnected}
          className="lg:sticky lg:top-24 lg:h-[calc(100dvh-8rem)]"
        />
      </div>

      <Sheet
        open={cancelNoticeOpen}
        onClose={closeCancelNotice}
        eyebrow={t(`Tirage #${previousRound?.contractRoundId ?? ''}`, `Draw #${previousRound?.contractRoundId ?? ''}`)}
        title={t('Le tirage est annulé', 'The draw is cancelled')}
      >
        <div className="flex flex-col gap-3">
          <p className="text-body text-fg-secondary">
            {previousRound?.participants === 0
              ? t('Personne ne s’est inscrit à ce tirage.', 'Nobody entered this draw.')
              : t(
                  'Ce tirage n’a pas réuni assez de participants : il en faut au moins 2.',
                  'This draw did not reach enough participants: at least 2 are needed.'
                )}
          </p>
          <p className="text-caption text-fg-muted">
            {t(
              'Les tickets achetés sont remboursés automatiquement. Un nouveau tirage est déjà ouvert.',
              'Purchased tickets are refunded automatically. A new draw is already open.'
            )}
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Link href="/billetterie" onClick={closeCancelNotice} className={buttonClasses('primary', 'md', false, true)}>
              {t('Participer au prochain tirage', 'Join the next draw')}
            </Link>
            <Button variant="outline" onClick={closeCancelNotice}>
              {t('Fermer', 'Close')}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
