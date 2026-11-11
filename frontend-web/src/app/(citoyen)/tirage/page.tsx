'use client';

import React, { useEffect } from 'react';
import ChatBox from '@/components/lottery/ChatBox';
import DemoModeBadge from '@/components/lottery/DemoModeBadge';
import RouletteAnimation from '@/components/lottery/RouletteAnimation';
import WinnerClaimCard from '@/components/lottery/WinnerClaimCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/Misc';
import useSocket from '@/hooks/useSocket';
import { trackEvent } from '@/lib/analytics';
import { useAppDispatch, useAppSelector } from '@/store';
import { useGetLotteryStatusQuery } from '@/store/api/lotteryApi';
import { setRouletteSpinning } from '@/store/slices/lotterySlice';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function LiveDrawPage() {
  const { t } = useAppTheme();
  const dispatch = useAppDispatch();
  const { data: statusRes } = useGetLotteryStatusQuery(undefined, { pollingInterval: 15000 });
  const status = statusRes?.data;
  const round = status?.round;
  const guarantees = status?.guarantees;
  const simulated = Boolean(guarantees?.simulated);
  const certified = !guarantees || (guarantees.vrfCertified && !guarantees.simulated);
  const contractExplorerUrl = status?.blockchain?.lotteryExplorerUrl;
  const { sendChatMessage } = useSocket(round?.id);
  const { onlineWaitingUsers, liveChatMessages, lastWinnerAnnouncement, isRouletteSpinning, socketConnected } =
    useAppSelector((s) => s.lottery);

  const winnerWallet = lastWinnerAnnouncement?.winnerWallet || round?.winnerWallet;
  const proof = lastWinnerAnnouncement?.vrfProofHash || round?.chainlinkRequestId;
  const drawRequested = !winnerWallet && round?.status === 'LOCKED';

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
        actions={<DemoModeBadge simulated={simulated} />}
      />

      <div className="grid gap-3.5 lg:grid-cols-[1.1fr_1fr] lg:gap-5">
        <div className="flex flex-col">
          <Card padding="sm" className="mb-3.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="text-caption font-semibold text-primary">{t("Salle d'attente", 'Waiting Room')}</p>
              <p className="text-caption font-medium text-secondary tabular">
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
          </Card>

          <WinnerClaimCard status={status} className="mb-3.5" />

          <RouletteAnimation
            spinning={isRouletteSpinning}
            winnerWallet={winnerWallet}
            vrfRequestId={proof}
            certified={certified}
            drawRequested={drawRequested}
          />

          <Button variant="outline" onClick={handleSimulateSpin} disabled={isRouletteSpinning}>
            {isRouletteSpinning ? t('Tirage en cours...', 'Drawing...') : t('Simuler la roue de tirage', 'Simulate Draw Wheel')}
          </Button>

          <Card padding="sm" className="mt-3.5 flex flex-col gap-1">
            <p className="text-caption font-semibold">
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
              <p className="break-all font-mono text-caption text-fg-muted">
                {t('Preuve : ', 'Proof: ')}
                {proof}
              </p>
            ) : null}
            {contractExplorerUrl ? (
              <a
                href={contractExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-caption font-medium text-primary underline-offset-2 hover:underline"
              >
                {t("Voir le Smart Contract sur l'explorateur de blocs →", 'View the Smart Contract on the block explorer →')}
              </a>
            ) : null}
          </Card>
        </div>

        <ChatBox
          messages={liveChatMessages}
          onSendMessage={sendChatMessage}
          connected={socketConnected}
          className="lg:sticky lg:top-24 lg:h-[calc(100dvh-8rem)]"
        />
      </div>
    </div>
  );
}
