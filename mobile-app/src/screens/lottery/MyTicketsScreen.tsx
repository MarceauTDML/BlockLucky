import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import CurrentTicketCard from '../../components/draw/CurrentTicketCard';
import { DrawResultCard, ScratchResultCard } from '../../components/draw/ResultCards';
import {
  getErrorMessage,
  isFinishedStatus,
  resolvePhase,
  secondsUntil,
  secondsUntilRoomOpens,
} from '../../components/draw/drawFormat';
import useNow from '../../components/draw/useNow';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import FilterChips from '../../components/ui/FilterChips';
import Loader from '../../components/ui/Loader';
import NotificationButton from '../../components/ui/NotificationButton';
import Screen from '../../components/ui/Screen';
import SectionHeader from '../../components/ui/SectionHeader';
import Icon, { IconName } from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import usePushNotifications from '../../hooks/usePushNotifications';
import { useRootNavigation } from '../../navigation/hooks';
import { useGetLotteryStatusQuery, useGetMyTransactionsQuery } from '../../store/api/lotteryApi';
import { useGetMyCodesQuery } from '../../store/api/marketplaceApi';
import { ClaimedRewardCode, LotteryPhase, TicketItem } from '../../types/api.types';

type TicketFilter = 'all' | 'draws' | 'scratch';

type ResultEntry =
  | { kind: 'draw'; date: number; ticket: TicketItem }
  | { kind: 'scratch'; date: number; claim: ClaimedRewardCode };

const timeOf = (iso?: string | null) => {
  const value = iso ? new Date(iso).getTime() : 0;
  return Number.isNaN(value) ? 0 : value;
};

const phaseFromStatus = (status?: string | null): LotteryPhase | null => {
  if (status === 'LOCKED') return 'DRAWING';
  if (status === 'OPEN') return 'OPEN';
  if (status === 'COMPLETED' || status === 'CANCELLED') return status;
  return null;
};

const EmptyState: React.FC<{
  icon: IconName;
  title: string;
  text: string;
  action?: { label: string; onPress: () => void };
}> = ({ icon, title, text, action }) => {
  const { colors } = useAppTheme();
  return (
    <Card radius={24} padding={22} style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.sunSoft }]}>
        <Icon name={icon} size={26} color={colors.onSun} />
      </View>
      <AppText variant="subtitle" align="center">
        {title}
      </AppText>
      <AppText size={12} color={colors.inkMuted} align="center">
        {text}
      </AppText>
      {action ? (
        <AppButton
          title={action.label}
          variant="dark"
          size="md"
          rightIcon="arrowRight"
          onPress={action.onPress}
          style={styles.emptyAction}
        />
      ) : null}
    </Card>
  );
};

const MyTicketsScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { unreadCount } = usePushNotifications();
  const [filter, setFilter] = useState<TicketFilter>('all');

  const status = useGetLotteryStatusQuery(undefined, { pollingInterval: 30000 });
  const ticketsQuery = useGetMyTransactionsQuery({ page: 1, limit: 50 });
  const codesQuery = useGetMyCodesQuery();

  const round = status.data?.data?.round;
  const progression = status.data?.data?.progression;
  const tickets = useMemo(() => ticketsQuery.data?.data?.tickets ?? [], [ticketsQuery.data]);
  const codes = useMemo(() => {
    const raw = codesQuery.data?.data?.codes;
    return Array.isArray(raw) ? raw : [];
  }, [codesQuery.data]);

  const currentTicket = tickets.find((ticket) => !isFinishedStatus(ticket.roundStatus));
  const finishedTickets = useMemo(
    () => tickets.filter((ticket) => isFinishedStatus(ticket.roundStatus)),
    [tickets],
  );
  const isCurrentRound = Boolean(
    currentTicket && round && currentTicket.contractRoundId === round.contractRoundId,
  );
  const currentPhase = currentTicket
    ? isCurrentRound
      ? resolvePhase(round)
      : phaseFromStatus(currentTicket.roundStatus)
    : null;
  const roundPhase = resolvePhase(round);
  const now = useNow(currentPhase === 'WAITING_ROOM' ? 1000 : 30000);
  const latestCompletedId = finishedTickets.find(
    (ticket) => ticket.roundStatus === 'COMPLETED',
  )?.id;

  const results = useMemo<ResultEntry[]>(() => {
    const draws: ResultEntry[] =
      filter === 'scratch'
        ? []
        : finishedTickets.map((ticket) => ({
            kind: 'draw',
            date: timeOf(ticket.purchasedAt),
            ticket,
          }));
    const scratches: ResultEntry[] =
      filter === 'draws'
        ? []
        : codes.map((claim) => ({ kind: 'scratch', date: timeOf(claim.claimedAt), claim }));
    return [...draws, ...scratches].sort((a, b) => b.date - a.date);
  }, [filter, finishedTickets, codes]);

  const total = tickets.length + codes.length;
  const ongoing = currentTicket ? 1 : 0;
  const done = finishedTickets.length + codes.length;
  const plural = (count: number, one: string, many: string) => (count > 1 ? many : one);
  const summary = t(
    `${total} ${plural(total, 'ticket', 'tickets')} · ${ongoing} en cours · ${done} ${plural(done, 'terminé', 'terminés')}`,
    `${total} ${plural(total, 'ticket', 'tickets')} · ${ongoing} ongoing · ${done} completed`,
  );

  const loading = ticketsQuery.isLoading || (codesQuery.isLoading && !codesQuery.data);
  const loadError = ticketsQuery.isError && !ticketsQuery.data;
  const refreshing =
    (ticketsQuery.isFetching || codesQuery.isFetching || status.isFetching) && !loading;
  const refresh = () => {
    status.refetch();
    ticketsQuery.refetch();
    codesQuery.refetch();
  };

  const canBuy = roundPhase === 'OPEN' || roundPhase === null;
  const showCurrent = filter !== 'scratch';

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="hero" accessibilityRole="header">
            {t('Mes tickets', 'My tickets')}
          </AppText>
          {!loading && !loadError ? (
            <AppText size={12} color={colors.inkMuted}>
              {summary}
            </AppText>
          ) : null}
        </View>
        <NotificationButton
          hasUnread={unreadCount > 0}
          onPress={() => navigation.navigate('Notifications')}
        />
      </View>

      <View style={styles.filters}>
        <FilterChips<TicketFilter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t(`Tous · ${total}`, `All · ${total}`) },
            {
              value: 'draws',
              label: t(`Grands tirages · ${tickets.length}`, `Grand draws · ${tickets.length}`),
            },
            {
              value: 'scratch',
              label: t(`À gratter · ${codes.length}`, `Scratch · ${codes.length}`),
            },
          ]}
        />
      </View>

      {loading ? (
        <Loader message={t('Chargement de vos tickets…', 'Loading your tickets…')} />
      ) : loadError ? (
        <Card radius={24} style={styles.empty}>
          <AppText variant="subtitle" align="center">
            {t('Tickets indisponibles', 'Tickets unavailable')}
          </AppText>
          <AppText size={12} color={colors.inkMuted} align="center">
            {getErrorMessage(
              ticketsQuery.error,
              t(
                'Impossible de charger vos tickets. Vérifiez votre connexion.',
                'Unable to load your tickets. Check your connection.',
              ),
            )}
          </AppText>
          <AppButton
            title={t('Réessayer', 'Try again')}
            variant="dark"
            size="md"
            onPress={refresh}
            style={styles.emptyAction}
          />
        </Card>
      ) : (
        <>
          {showCurrent ? (
            <>
              <SectionHeader
                title={t('En cours', 'Ongoing')}
                style={styles.firstSection}
                right={
                  currentTicket ? (
                    <AppText size={11} weight="medium" color={colors.inkMuted}>
                      {t('1 ticket', '1 ticket')}
                    </AppText>
                  ) : undefined
                }
              />
              {currentTicket ? (
                <>
                  <CurrentTicketCard
                    ticket={currentTicket}
                    phase={currentPhase}
                    ticketPriceEth={isCurrentRound ? (round?.ticketPriceEth ?? null) : null}
                    secondsToOpen={
                      isCurrentRound
                        ? secondsUntilRoomOpens(round, now, status.fulfilledTimeStamp ?? now)
                        : null
                    }
                    secondsToReveal={isCurrentRound ? secondsUntil(round?.revealAt, now) : null}
                    maxParticipants={
                      isCurrentRound
                        ? (round?.maxParticipants ?? progression?.targetParticipants ?? null)
                        : null
                    }
                    onOpenRoom={() => navigation.navigate('WaitingRoom')}
                    onOpenDraw={() => navigation.navigate('LiveDraw')}
                  />
                  {currentPhase === 'OPEN' ? (
                    <AppButton
                      title={t('Offrir un ticket à un proche', 'Gift a ticket to someone')}
                      variant="soft"
                      size="md"
                      leftIcon="giftTicket"
                      onPress={() =>
                        navigation.navigate('GiftTicket', { ticketId: currentTicket.id })
                      }
                      style={styles.gift}
                    />
                  ) : null}
                </>
              ) : (
                <Card tone="sunPale" radius={25} padding={18}>
                  <AppText variant="subtitle" color={colors.onSun}>
                    {t('Pas encore de ticket en cours', 'No ongoing ticket yet')}
                  </AppText>
                  <AppText size={12} color={colors.onSunMuted} style={styles.cardText}>
                    {canBuy
                      ? t(
                          'Un seul ticket par participant et par grand tirage. Le vôtre vous attend.',
                          'One ticket per participant and per draw. Yours is waiting.',
                        )
                      : t(
                          'Les achats sont clos pour ce grand tirage. Rendez-vous au prochain.',
                          'Purchases are closed for this draw. See you at the next one.',
                        )}
                  </AppText>
                  {canBuy ? (
                    <AppButton
                      title={t('Acheter mon ticket', 'Buy my ticket')}
                      variant="dark"
                      size="md"
                      rightIcon="arrowRight"
                      onPress={() => navigation.navigate('BuyTicket')}
                    />
                  ) : null}
                </Card>
              )}
            </>
          ) : null}

          <SectionHeader
            title={t('Vos résultats', 'Your results')}
            style={showCurrent ? undefined : styles.firstSection}
            right={
              results.length > 0 ? (
                <AppText size={10} weight="medium" color={colors.inkMuted}>
                  {t(
                    `${results.length} ${plural(results.length, 'ticket terminé', 'tickets terminés')}`,
                    `${results.length} completed`,
                  )}
                </AppText>
              ) : undefined
            }
          />

          {results.length === 0 ? (
            filter === 'scratch' ? (
              <EmptyState
                icon="star"
                title={t('Aucun ticket à gratter', 'No scratch cards yet')}
                text={t(
                  'Échangez vos EtherPoints contre un ticket à gratter et découvrez votre lot.',
                  'Swap your EtherPoints for a scratch card and discover your prize.',
                )}
                action={{
                  label: t('Gratter un ticket', 'Scratch a ticket'),
                  onPress: () => navigation.navigate('ScratchCard', { offer: 'violet' }),
                }}
              />
            ) : (
              <EmptyState
                icon="trophy"
                title={t('Aucun résultat pour l’instant', 'No results yet')}
                text={t(
                  'Vos résultats apparaîtront ici après chaque grand tirage.',
                  'Your results will appear here after each draw.',
                )}
                action={
                  canBuy && !currentTicket
                    ? {
                        label: t('Acheter mon ticket', 'Buy my ticket'),
                        onPress: () => navigation.navigate('BuyTicket'),
                      }
                    : undefined
                }
              />
            )
          ) : (
            results.map((entry) =>
              entry.kind === 'draw' ? (
                <DrawResultCard
                  key={`draw-${entry.ticket.id}`}
                  ticket={entry.ticket}
                  linkLabel={
                    entry.ticket.id === latestCompletedId
                      ? t('Voir le résultat du tirage', 'See the draw result')
                      : undefined
                  }
                  onPressLink={
                    entry.ticket.id === latestCompletedId
                      ? () => navigation.navigate('LiveDraw')
                      : undefined
                  }
                />
              ) : (
                <ScratchResultCard
                  key={`scratch-${entry.claim.id}`}
                  claim={entry.claim}
                  onPress={() => navigation.navigate('ScratchCard', { claim: entry.claim })}
                />
              ),
            )
          )}

          <View style={styles.links}>
            {filter === 'scratch' && codes.length > 0 ? (
              <AppButton
                title={t('Voir tous mes codes', 'See all my codes')}
                variant="ghost"
                size="md"
                onPress={() => navigation.navigate('MyCodes')}
              />
            ) : null}
            <AppButton
              title={t('Historique des transactions', 'Transaction history')}
              variant="ghost"
              size="md"
              onPress={() => navigation.navigate('TransactionHistory')}
            />
          </View>
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  filters: {
    marginTop: 18,
  },
  firstSection: {
    marginTop: 18,
  },
  gift: {
    marginTop: 10,
  },
  cardText: {
    marginTop: 6,
    marginBottom: 14,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyAction: {
    marginTop: 6,
    alignSelf: 'stretch',
  },
  links: {
    marginTop: 8,
  },
});

export default MyTicketsScreen;
