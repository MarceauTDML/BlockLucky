import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import CrossFade from '../../components/draw/CrossFade';
import DrawWheel, { WHEEL_SECTORS } from '../../components/draw/DrawWheel';
import {
  findTicketForRound,
  formatMockEth,
  formatRoundLabel,
  getErrorMessage,
  groupThousands,
  isFinishedStatus,
  resolvePhase,
} from '../../components/draw/drawFormat';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import Pill from '../../components/ui/Pill';
import ResultDialog from '../../components/ui/ResultDialog';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import useCitizenWallet from '../../hooks/useCitizenWallet';
import useSocket from '../../hooks/useSocket';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppSelector } from '../../store';
import {
  useGetLotteryStatusQuery,
  useGetMyTransactionsQuery,
  useGetWalletQuery,
} from '../../store/api/lotteryApi';
import { LotteryPhase, TicketItem } from '../../types/api.types';
import { RootStackParamList } from '../../types/navigation.types';
import { shortenWallet } from '../../utils/formatters.util';

const pad = (value: number) => String(value).padStart(5, '0');

const sectorFor = (ticketNumber: string | null): number => {
  if (!ticketNumber) return 0;
  const parsed = parseInt(ticketNumber, 10);
  return Number.isNaN(parsed) ? 0 : parsed % WHEEL_SECTORS;
};

const buildLabels = (
  participants: number | null,
  winning: string | null,
  mine: string | null,
  target: number,
): string[] => {
  const labels = Array.from({ length: WHEEL_SECTORS }, (_, index) => {
    if (!participants || participants <= 0 || index >= participants) return '';
    const spread = Math.floor((index * participants) / WHEEL_SECTORS) + 1;
    return pad(Math.min(participants, spread));
  });
  const used = new Set<string>();
  if (winning) {
    labels[target] = winning;
    used.add(winning);
  }
  if (mine && mine !== winning) {
    labels[(target + 3) % WHEEL_SECTORS] = mine;
    used.add(mine);
  }
  return labels.map((label, index) => {
    if (index === target || (mine && index === (target + 3) % WHEEL_SECTORS)) return label;
    return used.has(label) ? '' : label;
  });
};

export const LiveDrawScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'LiveDraw'>>();
  const watchedRound = route.params?.contractRoundId;
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { claimPrize, isClaiming } = useCitizenWallet();

  const status = useGetLotteryStatusQuery(undefined, { pollingInterval: 4000 });
  const ticketsQuery = useGetMyTransactionsQuery({ page: 1, limit: 25 });
  const { data: walletRes } = useGetWalletQuery();
  const announcement = useAppSelector((state) => state.lottery.lastWinnerAnnouncement);

  const statusRound = status.data?.data?.round;
  const progression = status.data?.data?.progression;
  const isDemo = Boolean(status.data?.data?.guarantees?.simulated);
  const statusPhase = resolvePhase(statusRound);
  const tickets = useMemo(() => ticketsQuery.data?.data?.tickets ?? [], [ticketsQuery.data]);
  const tracking = watchedRound !== undefined;
  const statusIsWatched = tracking && statusRound?.contractRoundId === watchedRound;
  const liveRound =
    tracking ||
    statusPhase === 'DRAWING' ||
    statusPhase === 'COMPLETED' ||
    statusPhase === 'CANCELLED';

  const previousRound = status.data?.data?.previousRound ?? null;
  const previousCancelled = previousRound?.status === 'CANCELLED' ? previousRound : null;

  const pastTicket: TicketItem | undefined = useMemo(
    () => (liveRound ? undefined : tickets.find((ticket) => ticket.roundStatus === 'COMPLETED')),
    [liveRound, tickets],
  );
  const showPreviousCancelled =
    !tracking &&
    !liveRound &&
    previousCancelled !== null &&
    (pastTicket?.contractRoundId ?? 0) < previousCancelled.contractRoundId;

  const contractRoundId = tracking
    ? watchedRound
    : liveRound
      ? statusRound?.contractRoundId
      : showPreviousCancelled
        ? previousCancelled?.contractRoundId
        : pastTicket?.contractRoundId;
  const myTicket =
    liveRound || showPreviousCancelled ? findTicketForRound(tickets, contractRoundId) : pastTicket;
  const announcementForRound =
    announcement && announcement.contractRoundId === contractRoundId ? announcement : null;
  const watchedWasCancelled =
    tracking && previousCancelled !== null && previousCancelled.contractRoundId === watchedRound;
  const trackedPhase = (): LotteryPhase | null => {
    if (statusIsWatched && (statusPhase === 'COMPLETED' || statusPhase === 'CANCELLED')) {
      return statusPhase;
    }
    if (watchedWasCancelled) return 'CANCELLED';
    if (announcementForRound) return 'COMPLETED';
    if (myTicket?.roundStatus === 'COMPLETED') return 'COMPLETED';
    if (myTicket?.roundStatus === 'CANCELLED') return 'CANCELLED';
    return 'DRAWING';
  };
  const phase = tracking
    ? trackedPhase()
    : liveRound
      ? statusPhase
      : showPreviousCancelled
        ? 'CANCELLED'
        : pastTicket
          ? 'COMPLETED'
          : statusPhase;
  const roundLabel = formatRoundLabel(contractRoundId);

  useSocket(liveRound ? statusRound?.id : undefined);

  const refetchTickets = ticketsQuery.refetch;
  useEffect(() => {
    if (phase === 'COMPLETED' || phase === 'CANCELLED') refetchTickets();
  }, [phase, refetchTickets]);

  useEffect(() => {
    if (!tracking || phase !== 'DRAWING') return undefined;
    const timer = setInterval(refetchTickets, 4000);
    return () => clearInterval(timer);
  }, [tracking, phase, refetchTickets]);

  const myWallet = (walletRes?.data?.walletAddress || user?.walletAddress || '').toLowerCase();
  const winnerWallet =
    announcementForRound?.winnerWallet ||
    (liveRound && (!tracking || statusIsWatched) ? statusRound?.winnerWallet : null) ||
    null;
  const winningNumber = myTicket?.winningTicketNumber ?? null;
  const myNumber = myTicket?.ticketNumber ?? null;
  const isWinner =
    Boolean(myTicket?.isWinner) ||
    Boolean(winnerWallet && myWallet && winnerWallet.toLowerCase() === myWallet);
  const hasResult =
    phase === 'COMPLETED' &&
    Boolean(winningNumber || winnerWallet || (myTicket && isFinishedStatus(myTicket.roundStatus)));
  const isCancelled = phase === 'CANCELLED';
  const resultLanded =
    hasResult && (winningNumber !== null || !myTicket || isFinishedStatus(myTicket.roundStatus));

  const snapshot = tracking && !statusIsWatched ? route.params : undefined;
  const participants = showPreviousCancelled
    ? (previousCancelled?.participants ?? null)
    : snapshot
      ? (snapshot.participants ?? null)
      : liveRound
        ? (statusRound?.participants ?? progression?.distinctParticipants ?? null)
        : null;
  const maxParticipants = snapshot
    ? (snapshot.maxParticipants ?? null)
    : liveRound
      ? (statusRound?.maxParticipants ?? progression?.targetParticipants ?? null)
      : null;
  const prizePool = snapshot
    ? (snapshot.prizePool ?? null)
    : liveRound
      ? (statusRound?.prizePool ?? null)
      : null;
  const myPrize = myTicket?.prizeEth ?? (isWinner ? prizePool : null);

  const target = sectorFor(winningNumber);
  const labels = useMemo(
    () => buildLabels(participants, winningNumber, myNumber, target),
    [participants, winningNumber, myNumber, target],
  );

  const [revealed, setRevealed] = useState(false);
  const revealedRound = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (revealedRound.current !== contractRoundId) {
      revealedRound.current = contractRoundId;
      setRevealed(false);
    }
  }, [contractRoundId]);

  const [dismissedCancel, setDismissedCancel] = useState<number | undefined>(undefined);
  const cancelDialogVisible =
    isCancelled && contractRoundId !== undefined && dismissedCancel !== contractRoundId;
  const closeCancelDialog = () => setDismissedCancel(contractRoundId);

  const [claimMessage, setClaimMessage] = useState<{ text: string; error: boolean } | null>(null);
  const handleClaim = async () => {
    if (contractRoundId === undefined) return;
    setClaimMessage(null);
    const outcome = await claimPrize(contractRoundId);
    if (outcome.status === 'CLAIMED') {
      setClaimMessage({
        text: t('Gains versés sur votre portefeuille.', 'Winnings paid to your wallet.'),
        error: false,
      });
    } else if (outcome.status === 'ALREADY_CLAIMED') {
      setClaimMessage({
        text: t(
          'Gains déjà versés sur votre portefeuille.',
          'Winnings already paid to your wallet.',
        ),
        error: false,
      });
    } else {
      setClaimMessage({
        text:
          outcome.message ||
          t('Le retrait est momentanément indisponible.', 'Withdrawal is temporarily unavailable.'),
        error: true,
      });
    }
  };

  const wheelSize = Math.min(300, width - 40 - 36);
  const goBack = () =>
    navigation.canGoBack()
      ? navigation.goBack()
      : navigation.navigate('Main', { screen: 'HomeTab' });
  const goHome = () => navigation.navigate('Main', { screen: 'HomeTab' });
  const goTickets = () => navigation.navigate('Main', { screen: 'TicketsTab' });
  const subtitle = roundLabel
    ? t(`EtherBay · Grand tirage #${roundLabel}`, `EtherBay · Draw #${roundLabel}`)
    : t('EtherBay', 'EtherBay');
  const refresh = () => {
    status.refetch();
    ticketsQuery.refetch();
  };

  if ((status.isLoading || ticketsQuery.isLoading) && !statusRound) {
    return (
      <Screen showSecurityFooter>
        <ScreenHeader title={t('Le grand tirage', 'The grand draw')} onBack={goBack} />
        <Loader message={t('Préparation du tirage…', 'Preparing the draw…')} />
      </Screen>
    );
  }

  if (!statusRound && !pastTicket && !showPreviousCancelled) {
    return (
      <Screen showSecurityFooter>
        <ScreenHeader title={t('Le grand tirage', 'The grand draw')} onBack={goBack} />
        <Card style={styles.stack}>
          <AppText variant="subtitle" align="center">
            {t('Tirage indisponible', 'Draw unavailable')}
          </AppText>
          <AppText size={12} color={colors.inkMuted} align="center">
            {getErrorMessage(
              status.error,
              t(
                'Impossible de charger le grand tirage. Vérifiez votre connexion.',
                'Unable to load the draw. Check your connection.',
              ),
            )}
          </AppText>
          <AppButton
            title={t('Réessayer', 'Try again')}
            variant="dark"
            size="md"
            onPress={refresh}
          />
        </Card>
      </Screen>
    );
  }

  if (!liveRound && !pastTicket && !showPreviousCancelled) {
    return (
      <Screen showSecurityFooter>
        <ScreenHeader
          title={t('Le grand tirage', 'The grand draw')}
          subtitle={subtitle}
          onBack={goBack}
        />
        <Card tone="sunSoft" radius={28} style={styles.stack}>
          <AppText size={22} weight="bold" align="center" color={colors.onSun}>
            {t('Le tirage n’a pas encore commencé.', 'The draw has not started yet.')}
          </AppText>
          <AppText size={12} align="center" color={colors.onSunMuted}>
            {t(
              'La roue tourne à la fin de la salle d’attente, 10 minutes après son ouverture.',
              'The wheel spins at the end of the waiting room, 10 minutes after it opens.',
            )}
          </AppText>
        </Card>
        <View style={styles.actions}>
          <AppButton
            title={t('Voir la salle d’attente', 'See the waiting room')}
            variant="dark"
            onPress={() => navigation.replace('WaitingRoom')}
          />
          <AppButton
            title={t('Retour à l’accueil', 'Back to home')}
            variant="ghost"
            size="md"
            onPress={goHome}
          />
        </View>
      </Screen>
    );
  }

  const settled = revealed && resultLanded;
  const footerLine =
    participants !== null
      ? t(
          `${groupThousands(participants)} participants · ${maxParticipants && participants >= maxParticipants ? 'Plafond atteint' : 'Temps écoulé'}`,
          `${groupThousands(participants)} participants · ${maxParticipants && participants >= maxParticipants ? 'Limit reached' : 'Time is up'}`,
        )
      : null;

  const winnerDisplay = winningNumber ?? (winnerWallet ? shortenWallet(winnerWallet) : null);

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={t('Le grand tirage', 'The grand draw')}
        subtitle={subtitle}
        onBack={goBack}
      />

      <Card tone="sun" radius={28} padding={18}>
        <CrossFade
          height={24}
          activeKey={isCancelled ? 'cancelled' : settled ? 'done' : 'live'}
          items={[
            {
              key: 'live',
              content: <Pill tone="ink" dot label={t('Tirage en cours', 'Draw in progress')} />,
            },
            {
              key: 'done',
              content: <Pill tone="ink" dot label={t('Tirage terminé', 'Draw complete')} />,
            },
            {
              key: 'cancelled',
              content: <Pill tone="ink" dot label={t('Tirage annulé', 'Draw cancelled')} />,
            },
          ]}
        />
        <AppText
          size={26}
          weight="bold"
          align="center"
          color={colors.onSun}
          style={styles.heading}
          accessibilityRole="header"
        >
          {isCancelled
            ? t('Tirage annulé.', 'Draw cancelled.')
            : t('Place au résultat.', 'Time for the result.')}
        </AppText>
        <View style={styles.wheelWrap}>
          <DrawWheel
            size={wheelSize}
            labels={labels}
            centerLabel={roundLabel}
            spinning={phase === 'DRAWING' || (phase === 'COMPLETED' && !resultLanded)}
            targetIndex={resultLanded ? target : null}
            highlightIndex={settled ? target : null}
            onSettled={() => setRevealed(true)}
            accessibilityLabel={
              settled && winnerDisplay
                ? t(
                    `Roue arrêtée sur le ticket gagnant ${winnerDisplay}`,
                    `Wheel stopped on winning ticket ${winnerDisplay}`,
                  )
                : t('Roue du grand tirage en rotation', 'Draw wheel spinning')
            }
          />
        </View>
        {footerLine ? (
          <AppText
            size={11}
            weight="medium"
            align="center"
            color={colors.onSun}
            style={styles.footerLine}
          >
            {footerLine}
          </AppText>
        ) : null}
      </Card>

      <Card radius={24} padding={18} style={styles.block}>
        <CrossFade
          height={104}
          activeKey={isCancelled ? 'cancelled' : settled ? 'winner' : 'spinning'}
          items={[
            {
              key: 'spinning',
              content: (
                <View style={styles.center}>
                  <AppText size={20} weight="bold" align="center">
                    {t('Un ticket sera retenu.', 'One ticket will be drawn.')}
                  </AppText>
                  <AppText size={12} align="center" color={colors.inkMuted}>
                    {t(
                      'La roue s’arrête sur le numéro gagnant.',
                      'The wheel stops on the winning number.',
                    )}
                  </AppText>
                </View>
              ),
            },
            {
              key: 'winner',
              content: (
                <View style={styles.center} accessibilityLiveRegion="polite">
                  <AppText size={10} weight="bold" align="center" color={colors.green}>
                    {winningNumber
                      ? t('LE TICKET GAGNANT', 'THE WINNING TICKET')
                      : t('LE PORTEFEUILLE GAGNANT', 'THE WINNING WALLET')}
                  </AppText>
                  {winnerDisplay ? (
                    <AppText
                      size={winningNumber ? 42 : 24}
                      weight="bold"
                      align="center"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {winnerDisplay}
                    </AppText>
                  ) : null}
                  <AppText size={12} weight="medium" align="center" color={colors.green}>
                    {isWinner
                      ? t(
                          'C’est votre ticket, félicitations !',
                          'It is your ticket, congratulations!',
                        )
                      : t('Félicitations à son propriétaire !', 'Congratulations to its owner!')}
                  </AppText>
                </View>
              ),
            },
            {
              key: 'cancelled',
              content: (
                <View style={styles.center}>
                  <AppText size={20} weight="bold" align="center">
                    {t('Aucun ticket retenu.', 'No ticket drawn.')}
                  </AppText>
                  <AppText size={12} align="center" color={colors.inkMuted}>
                    {t(
                      'Les participations sont remboursées automatiquement.',
                      'Entries are refunded automatically.',
                    )}
                  </AppText>
                </View>
              ),
            },
          ]}
        />
      </Card>

      {settled && myTicket && isWinner ? (
        <Card tone="lavender" radius={22} style={styles.block}>
          <AppText variant="overline" color={colors.violet}>
            {t('Votre gain', 'Your prize')}
          </AppText>
          {myPrize !== null && myPrize !== undefined ? (
            <AppText size={24} weight="bold" style={styles.amount}>
              {formatMockEth(myPrize, t)}
            </AppText>
          ) : null}
          <AppText size={11} color={colors.inkMuted}>
            {t(
              'Versés sur votre portefeuille BlockLucky, avec les lots offerts par les commerces d’EtherBay.',
              'Paid to your BlockLucky wallet, along with gifts from EtherBay shops.',
            )}
          </AppText>
          {!isDemo ? (
            <View style={styles.claim}>
              <AppButton
                title={t('Vérifier le versement', 'Check the payout')}
                variant="dark"
                size="md"
                loading={isClaiming}
                onPress={handleClaim}
              />
              {claimMessage ? (
                <AppText size={11} color={claimMessage.error ? colors.terracotta : colors.green}>
                  {claimMessage.text}
                </AppText>
              ) : null}
            </View>
          ) : null}
        </Card>
      ) : settled && myTicket ? (
        <Card radius={22} style={styles.block}>
          <AppText variant="overline" color={colors.inkMuted}>
            {t('Votre ticket', 'Your ticket')}
          </AppText>
          {myNumber ? (
            <AppText size={24} weight="bold" style={styles.amount}>
              {myNumber}
            </AppText>
          ) : null}
          <AppText size={13} weight="semibold">
            {t(
              'Pas cette fois, mais merci d’avoir participé.',
              'Not this time, but thank you for taking part.',
            )}
          </AppText>
          <AppText size={11} color={colors.inkMuted} style={styles.note}>
            {t(
              'Chaque grand tirage repart de zéro. Rendez-vous au prochain !',
              'Every draw starts afresh. See you at the next one!',
            )}
          </AppText>
        </Card>
      ) : !isCancelled && prizePool !== null ? (
        <Card tone="lavender" radius={22} style={styles.block}>
          <AppText variant="overline" color={colors.violet}>
            {t('Pour le gagnant', 'For the winner')}
          </AppText>
          <AppText size={24} weight="bold" style={styles.amount}>
            {formatMockEth(prizePool, t)}
          </AppText>
          <AppText size={11} color={colors.inkMuted}>
            {t(
              'et les lots offerts par les commerces d’EtherBay.',
              'plus gifts from EtherBay shops.',
            )}
          </AppText>
        </Card>
      ) : null}

      {settled || isCancelled ? (
        <View style={styles.actions}>
          <AppButton title={t('Retour à l’accueil', 'Back to home')} onPress={goHome} />
          <AppButton
            title={t('Voir mes tickets', 'See my tickets')}
            variant="ghost"
            size="md"
            onPress={goTickets}
          />
        </View>
      ) : null}

      <ResultDialog
        visible={cancelDialogVisible}
        status="info"
        title={t('Le tirage est annulé', 'The draw is cancelled')}
        message={
          participants === 0
            ? t(
                `Personne ne s’est inscrit au tirage #${roundLabel ?? ''}.`,
                `Nobody entered draw #${roundLabel ?? ''}.`,
              )
            : t(
                `Le tirage #${roundLabel ?? ''} n’a pas réuni assez de participants : il en faut au moins 2.`,
                `Draw #${roundLabel ?? ''} did not reach enough participants: at least 2 are needed.`,
              )
        }
        note={t(
          'Les tickets achetés sont remboursés automatiquement. Un nouveau tirage est déjà ouvert.',
          'Purchased tickets are refunded automatically. A new draw is already open.',
        )}
        primaryLabel={t('Participer au prochain tirage', 'Join the next draw')}
        onPrimary={() => {
          closeCancelDialog();
          navigation.navigate('BuyTicket');
        }}
        secondaryLabel={t('Fermer', 'Close')}
        onSecondary={closeCancelDialog}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  heading: {
    marginTop: 10,
    marginBottom: 8,
  },
  wheelWrap: {
    alignItems: 'center',
  },
  footerLine: {
    marginTop: 12,
  },
  block: {
    marginTop: 20,
  },
  center: {
    alignItems: 'center',
    gap: 8,
  },
  amount: {
    marginTop: 6,
    marginBottom: 6,
  },
  note: {
    marginTop: 4,
  },
  claim: {
    marginTop: 14,
    gap: 8,
  },
  actions: {
    marginTop: 24,
    gap: 6,
  },
});

export default LiveDrawScreen;
