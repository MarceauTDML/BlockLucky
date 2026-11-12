import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import CrossFade from '../../components/draw/CrossFade';
import PulseDots from '../../components/draw/PulseDots';
import RollingValue from '../../components/draw/RollingValue';
import RoomChat from '../../components/draw/RoomChat';
import WaitingRoomClosed from '../../components/draw/WaitingRoomClosed';
import {
  WAITING_ROOM_SECONDS,
  findTicketForRound,
  formatRoundLabel,
  getErrorMessage,
  getParticipants,
  resolvePhase,
  secondsUntil,
  secondsUntilRoomOpens,
} from '../../components/draw/drawFormat';
import useNow from '../../components/draw/useNow';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import Pill from '../../components/ui/Pill';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import Icon from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import useSocket from '../../hooks/useSocket';
import useSound, { CHRONO_SECONDS, SOUNDS } from '../../hooks/useSound';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppSelector } from '../../store';
import {
  useGetLotteryStatusQuery,
  useGetMyTransactionsQuery,
  useGetWalletQuery,
} from '../../store/api/lotteryApi';
import { LotteryRoundInfo } from '../../types/api.types';
import { RootStackParamList } from '../../types/navigation.types';

const anonymize = (wallet?: string | null): string | null =>
  wallet && wallet.length >= 10 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;

const revealSeconds = (round: LotteryRoundInfo | undefined, now: number): number | null => {
  if (!round) return null;
  const direct = secondsUntil(round.revealAt, now);
  if (direct !== null) return direct;
  if (!round.waitingRoomOpensAt) return null;
  const opensAt = new Date(round.waitingRoomOpensAt).getTime();
  if (Number.isNaN(opensAt)) return null;
  return Math.max(0, Math.round((opensAt + WAITING_ROOM_SECONDS * 1000 - now) / 1000));
};

const WaitingRoomScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const now = useNow(1000);

  const status = useGetLotteryStatusQuery(undefined, { pollingInterval: 5000 });
  const ticketsQuery = useGetMyTransactionsQuery({ page: 1, limit: 25 });
  const { data: walletRes } = useGetWalletQuery();

  const round = status.data?.data?.round;
  const progression = status.data?.data?.progression;
  const phase = resolvePhase(round);
  const tickets = useMemo(() => ticketsQuery.data?.data?.tickets ?? [], [ticketsQuery.data]);
  const myTicket = findTicketForRound(tickets, round?.contractRoundId);
  const roomActive = phase === 'WAITING_ROOM' && Boolean(myTicket);
  const roundLabel = formatRoundLabel(round?.contractRoundId);

  const { sendChatMessage } = useSocket(roomActive ? round?.id : undefined);
  const { liveChatMessages, onlineWaitingUsers } = useAppSelector((state) => state.lottery);
  const myWallet = anonymize(walletRes?.data?.walletAddress || user?.walletAddress);
  const announcement = useAppSelector((state) => state.lottery.lastWinnerAnnouncement);

  const watchedRound = useRef<RootStackParamList['LiveDraw']>(undefined);
  const snapshotParticipants = getParticipants(round, progression?.distinctParticipants);
  const snapshotMax = round?.maxParticipants ?? progression?.targetParticipants ?? null;
  const snapshotPrize = round?.prizePool ?? null;
  useEffect(() => {
    if (myTicket && round?.contractRoundId !== undefined) {
      watchedRound.current = {
        contractRoundId: round.contractRoundId,
        participants: snapshotParticipants,
        maxParticipants: snapshotMax,
        prizePool: snapshotPrize,
      };
    }
  }, [myTicket, round?.contractRoundId, snapshotParticipants, snapshotMax, snapshotPrize]);

  const remaining = revealSeconds(round, now);
  const revealReached = phase === 'WAITING_ROOM' && remaining !== null && remaining <= 0;
  const announcedRound = announcement?.contractRoundId;
  const currentRound = round?.contractRoundId;

  const { play: playChrono, stop: stopChrono } = useSound(SOUNDS.chrono);
  const chronoRound = useRef<number | undefined>(undefined);
  const inFinalCountdown =
    roomActive && remaining !== null && remaining > 0 && remaining <= CHRONO_SECONDS;
  useEffect(() => {
    if (!inFinalCountdown || currentRound === undefined) return;
    if (chronoRound.current === currentRound) return;
    chronoRound.current = currentRound;
    playChrono();
  }, [inFinalCountdown, currentRound, playChrono]);
  useEffect(() => {
    if (!roomActive) stopChrono();
  }, [roomActive, stopChrono]);
  useEffect(() => stopChrono, [stopChrono]);

  useEffect(() => {
    const watched = watchedRound.current;
    const watchedId = watched?.contractRoundId;
    const moved =
      watchedId !== undefined &&
      (announcedRound === watchedId || (currentRound !== undefined && currentRound > watchedId));
    if (phase === 'DRAWING' || phase === 'COMPLETED' || revealReached || moved) {
      navigation.replace('LiveDraw', watched ?? { contractRoundId: currentRound });
    }
  }, [phase, revealReached, announcedRound, currentRound, navigation]);

  const minutes = remaining === null ? '--' : String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = remaining === null ? '--' : String(remaining % 60).padStart(2, '0');
  const elapsed = remaining === null ? 0 : WAITING_ROOM_SECONDS - remaining;
  const messageKey =
    remaining === null
      ? 'm1'
      : remaining <= 0
        ? 'go'
        : remaining <= 30
          ? 'ready'
          : elapsed < 120
            ? 'm1'
            : elapsed < 420
              ? 'm2'
              : 'm3';

  const slotWidth = Math.min(115, Math.floor((width - 40 - 36 - 40) / 2));
  const subtitle = roundLabel
    ? t(`EtherBay · Grand tirage #${roundLabel}`, `EtherBay · Draw #${roundLabel}`)
    : t('EtherBay', 'EtherBay');
  const goBack = () =>
    navigation.canGoBack()
      ? navigation.goBack()
      : navigation.navigate('Main', { screen: 'HomeTab' });
  const loading = (status.isLoading || ticketsQuery.isLoading) && !round;

  const refresh = () => {
    status.refetch();
    ticketsQuery.refetch();
  };

  const messageLine = (fr: string, en: string) => (
    <AppText size={12} weight="medium" align="center" color={colors.onSun}>
      {t(fr, en)}
    </AppText>
  );

  if (loading) {
    return (
      <Screen showSecurityFooter>
        <ScreenHeader title={t('Salle d’attente', 'Waiting room')} onBack={goBack} />
        <Loader message={t('Ouverture de la salle…', 'Opening the room…')} />
      </Screen>
    );
  }

  if (!round) {
    return (
      <Screen showSecurityFooter>
        <ScreenHeader title={t('Salle d’attente', 'Waiting room')} onBack={goBack} />
        <Card style={styles.errorCard}>
          <AppText variant="subtitle" align="center">
            {t('Salle indisponible', 'Room unavailable')}
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

  if (!roomActive) {
    return (
      <Screen
        showSecurityFooter
        refreshing={status.isFetching && !status.isLoading}
        onRefresh={refresh}
      >
        <ScreenHeader
          title={t('Le grand tirage', 'The grand draw')}
          subtitle={subtitle}
          onBack={goBack}
        />
        <WaitingRoomClosed
          phase={phase}
          contractRoundId={round.contractRoundId}
          ticket={myTicket}
          secondsToOpen={secondsUntilRoomOpens(round, now, status.fulfilledTimeStamp ?? now)}
          participants={getParticipants(round, progression?.distinctParticipants)}
          maxParticipants={round.maxParticipants ?? progression?.targetParticipants ?? null}
          onHome={() => navigation.navigate('Main', { screen: 'HomeTab' })}
          onTickets={() => navigation.navigate('Main', { screen: 'TicketsTab' })}
          onBuy={() => navigation.navigate('BuyTicket')}
        />
      </Screen>
    );
  }

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={t('Salle d’attente', 'Waiting room')}
        subtitle={subtitle}
        onBack={goBack}
      />

      <Card tone="sun" radius={28} padding={18}>
        <Pill tone="ink" dot label={t('La salle est ouverte', 'The room is open')} />
        <AppText
          size={26}
          weight="bold"
          align="center"
          color={colors.onSun}
          style={styles.welcome}
          accessibilityRole="header"
        >
          {t('Bienvenue à tous.', 'Welcome, everyone.')}
        </AppText>
        <AppText size={12} weight="medium" align="center" color={colors.onSun}>
          {t('Révélation dans', 'Reveal in')}
        </AppText>

        <View
          style={styles.countdown}
          accessible
          accessibilityRole="timer"
          accessibilityLabel={
            remaining === null
              ? t('Révélation imminente', 'Reveal coming soon')
              : t(
                  `Révélation dans ${minutes} minutes et ${seconds} secondes`,
                  `Reveal in ${minutes} minutes and ${seconds} seconds`,
                )
          }
        >
          <View style={styles.unit}>
            <RollingValue
              value={minutes}
              height={72}
              width={slotWidth}
              fontSize={51}
              color={colors.onSun}
              backgroundColor={colors.sunSoft}
            />
            <AppText variant="label" align="center" color={colors.onSun}>
              {t('Minutes', 'Minutes')}
            </AppText>
          </View>
          <AppText size={44} weight="semibold" color={colors.onSun} style={styles.colon}>
            :
          </AppText>
          <View style={styles.unit}>
            <RollingValue
              value={seconds}
              height={72}
              width={slotWidth}
              fontSize={51}
              color={colors.onSun}
              backgroundColor={colors.sunSoft}
            />
            <AppText variant="label" align="center" color={colors.onSun}>
              {t('Secondes', 'Seconds')}
            </AppText>
          </View>
        </View>

        <CrossFade
          height={38}
          activeKey={messageKey}
          duration={200}
          style={styles.messages}
          items={[
            {
              key: 'm1',
              content: messageLine(
                'Installez-vous et profitez de la discussion.',
                'Settle in and enjoy the chat.',
              ),
            },
            {
              key: 'm2',
              content: messageLine(
                'Un moment à partager,\nensemble à EtherBay.',
                'A moment to share,\ntogether in EtherBay.',
              ),
            },
            {
              key: 'm3',
              content: messageLine(
                'Gardez cet écran ouvert.\nVotre ticket est bien inscrit.',
                'Keep this screen open.\nYour ticket is registered.',
              ),
            },
            { key: 'ready', content: messageLine('Tenez-vous prêts !', 'Get ready!') },
            { key: 'go', content: messageLine('C’est parti !', 'Here we go!') },
          ]}
        />
        <View style={styles.dots}>
          <PulseDots color={colors.onSun} />
        </View>
      </Card>

      <View style={styles.closedRow}>
        <Icon name="check" size={14} color={colors.green} />
        <AppText size={10} weight="medium" color={colors.green}>
          {t(
            'Achats clos · Révélation à la fin de ce compte à rebours.',
            'Purchases closed · Reveal at the end of this countdown.',
          )}
        </AppText>
      </View>

      <RoomChat
        messages={liveChatMessages}
        myAnonymizedWallet={myWallet}
        onlineCount={onlineWaitingUsers}
        onSend={(message) => sendChatMessage(message)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  errorCard: {
    gap: 12,
    alignItems: 'stretch',
  },
  welcome: {
    marginTop: 14,
    marginBottom: 2,
  },
  countdown: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: 10,
    gap: 6,
  },
  unit: {
    alignItems: 'center',
    gap: 6,
  },
  colon: {
    marginTop: 6,
    width: 28,
    textAlign: 'center',
  },
  messages: {
    marginTop: 12,
  },
  dots: {
    marginTop: 8,
    marginBottom: 2,
  },
  closedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
});

export default WaitingRoomScreen;
