import React, { useCallback, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import DeadlineCard from '../../components/lottery/DeadlineCard';
import DrawStatusBadge from '../../components/lottery/DrawStatusBadge';
import MilestonesPanel from '../../components/lottery/MilestonesPanel';
import ScratchOfferCard from '../../components/lottery/ScratchOfferCard';
import {
  findCurrentRoundTicket,
  formatDecimal,
  formatEth,
  formatInteger,
  formatRoundNumber,
  formatTicketPrice,
  getApiErrorMessage,
  purchaseDeadline,
  resolveParticipants,
  resolvePhase,
} from '../../components/lottery/lotteryFormat';
import useCountdown from '../../components/lottery/useCountdown';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import BrandLogo from '../../components/ui/BrandLogo';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import NotificationButton from '../../components/ui/NotificationButton';
import Pill from '../../components/ui/Pill';
import Screen from '../../components/ui/Screen';
import SectionHeader from '../../components/ui/SectionHeader';
import Icon from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import usePoints from '../../hooks/usePoints';
import usePushNotifications from '../../hooks/usePushNotifications';
import { useRootNavigation } from '../../navigation/hooks';
import { useGetQuestsQuery, useGetReferralsQuery } from '../../store/api/authApi';
import {
  useGetLotteryStatusQuery,
  useGetMyTransactionsQuery,
  useGetWalletQuery,
} from '../../store/api/lotteryApi';
import { useGetCatalogQuery } from '../../store/api/marketplaceApi';

const SCRATCH_COSTS = { violet: 50, lucky: 100 } as const;

export const HomeScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { pointsBalance, refetchPoints } = usePoints();
  const { unreadCount, refetchNotifications } = usePushNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const statusQuery = useGetLotteryStatusQuery(undefined, { pollingInterval: 30000 });
  const walletQuery = useGetWalletQuery();
  const ticketsQuery = useGetMyTransactionsQuery();
  const referralsQuery = useGetReferralsQuery();
  const catalogQuery = useGetCatalogQuery();
  const questsQuery = useGetQuestsQuery();

  const status = statusQuery.data?.data;
  const round = status?.round;
  const phase = resolvePhase(round);
  const participants = resolveParticipants(status);
  const ownTicket = findCurrentRoundTicket(ticketsQuery.data?.data?.tickets, round);
  const ticketPrice = round?.ticketPriceEth ?? 0;
  const walletBalance = walletQuery.data?.data?.balanceEth ?? null;
  const referrals = referralsQuery.data?.data;
  const points = Number(pointsBalance || 0);
  const rewards = (catalogQuery.data?.data?.catalog ?? [])
    .filter((reward) => reward.isActive && reward.remainingStock > 0)
    .slice(0, 2);
  const nextQuest = (questsQuery.data?.data?.quests ?? []).find((quest) => !quest.completed);

  const countdownTarget =
    phase === 'WAITING_ROOM' ? (round?.revealAt ?? null) : purchaseDeadline(round);
  const seconds = useCountdown(
    countdownTarget,
    phase === 'OPEN' ? round?.remainingSeconds : undefined,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      statusQuery.refetch(),
      walletQuery.refetch(),
      ticketsQuery.refetch(),
      referralsQuery.refetch(),
      catalogQuery.refetch(),
      questsQuery.refetch(),
      refetchPoints(),
      refetchNotifications(),
    ]);
    setRefreshing(false);
  }, [
    statusQuery,
    walletQuery,
    ticketsQuery,
    referralsQuery,
    catalogQuery,
    questsQuery,
    refetchPoints,
    refetchNotifications,
  ]);

  const shareReferral = useCallback(async () => {
    if (!referrals) return;
    try {
      await Share.share({
        message: t(
          `Rejoins-moi sur BlockLucky, la loterie citoyenne gratuite d’EtherBay. Mon code de parrainage : ${referrals.referralCode}\n${referrals.referralLink}`,
          `Join me on BlockLucky, EtherBay's free citizen lottery. My referral code: ${referrals.referralCode}\n${referrals.referralLink}`,
        ),
      });
    } catch {}
  }, [referrals, t]);

  const goToTickets = () => navigation.navigate('Main', { screen: 'TicketsTab' });

  const renderDrawCta = () => {
    if (!round) return null;
    if (phase === 'WAITING_ROOM' || phase === 'DRAWING') {
      return (
        <AppButton
          title={
            phase === 'DRAWING'
              ? t('Suivre le tirage en direct', 'Watch the live draw')
              : t('Entrer dans la salle d’attente', 'Enter the waiting room')
          }
          variant="dark"
          leftIcon="clock"
          rightIcon="arrowRight"
          align="space-between"
          onPress={() => navigation.navigate('WaitingRoom')}
        />
      );
    }
    if (ownTicket !== undefined || phase !== 'OPEN') {
      return (
        <AppButton
          title={
            ownTicket
              ? t('Voir mon ticket', 'View my ticket')
              : t('Voir mes tickets', 'View my tickets')
          }
          variant="dark"
          leftIcon="ticket"
          rightIcon="arrowRight"
          align="space-between"
          onPress={goToTickets}
        />
      );
    }
    return (
      <AppButton
        title={t(
          `Mon ticket · ${formatTicketPrice(ticketPrice)} ETH`,
          `My ticket · ${formatTicketPrice(ticketPrice)} ETH`,
        )}
        variant="dark"
        leftIcon="ticket"
        rightIcon="arrowRight"
        align="space-between"
        accessibilityHint={t('Ouvre l’écran d’achat du ticket', 'Opens the ticket purchase screen')}
        onPress={() => navigation.navigate('BuyTicket')}
      />
    );
  };

  const deadlineLabel =
    phase === 'WAITING_ROOM'
      ? t('Révélation dans', 'Reveal in')
      : t('Fin des achats dans', 'Purchases close in');
  const maxPrize = participants.max * ticketPrice;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <BrandLogo />
        <NotificationButton
          hasUnread={unreadCount > 0}
          onPress={() => navigation.navigate('Notifications')}
        />
      </View>
      <View style={styles.cityRow}>
        <Icon name="location" size={17} color={colors.inkMuted} />
        <AppText size={12} weight="medium" color={colors.inkMuted}>
          {t('EtherBay · Loterie citoyenne gratuite', 'EtherBay · Free citizen lottery')}
        </AppText>
      </View>

      <Card style={styles.walletCard}>
        <AppText variant="overline" color={colors.inkMuted}>
          {t('Mon portefeuille', 'My wallet')}
        </AppText>
        <View style={styles.walletRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              `Solde ${formatEth(walletBalance)} fictifs, voir l’historique`,
              `Balance ${formatEth(walletBalance)}, view history`,
            )}
            onPress={() => navigation.navigate('TransactionHistory')}
            style={({ pressed }) => [
              styles.walletTile,
              { backgroundColor: colors.sunSoft, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <AppText
              size={25}
              weight="bold"
              color={colors.onSun}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {walletQuery.isLoading ? '…' : formatEth(walletBalance)}
            </AppText>
            <AppText size={10} weight="medium" color={colors.onSun}>
              {t('fictifs · offerts par la Mairie', 'fictional · granted by the City')}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              `${points} EtherPoints, voir mes avantages`,
              `${points} EtherPoints, view my perks`,
            )}
            onPress={() => navigation.navigate('RewardsCatalog')}
            style={({ pressed }) => [
              styles.walletTile,
              { backgroundColor: colors.lavender, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <AppText size={25} weight="bold" numberOfLines={1} adjustsFontSizeToFit>
              {formatInteger(points)}
            </AppText>
            <AppText size={10} weight="medium">
              {t('EtherPoints · Mes avantages', 'EtherPoints · My perks')}
            </AppText>
          </Pressable>
        </View>
        <AppText size={13} weight="bold" style={styles.walletNote}>
          {t('Monnaie fictive, aucune valeur réelle.', 'Fictional currency, no real value.')}
        </AppText>
        <AppText size={11} color={colors.inkMuted} style={styles.walletHint}>
          {t(
            'Votre portefeuille est créé dès l’inscription. L’app s’occupe de tout. Vous n’installez rien.',
            'Your wallet is created when you sign up. The app handles everything. Nothing to install.',
          )}
        </AppText>
      </Card>

      {statusQuery.isLoading && !status ? (
        <Loader message={t('Chargement du grand tirage…', 'Loading the grand draw…')} />
      ) : !status ? (
        <Card tone="peach" style={styles.drawCard}>
          <AppText size={16} weight="bold">
            {t(
              'Le grand tirage est momentanément indisponible.',
              'The grand draw is temporarily unavailable.',
            )}
          </AppText>
          <AppText size={12} color={colors.inkMuted} style={styles.errorText}>
            {getApiErrorMessage(
              statusQuery.error,
              t('Vérifiez votre connexion puis réessayez.', 'Check your connection and try again.'),
            )}
          </AppText>
          <AppButton
            title={t('Réessayer', 'Try again')}
            variant="dark"
            size="md"
            onPress={() => statusQuery.refetch()}
          />
        </Card>
      ) : (
        <>
          <Card tone="sun" radius={28} padding={20} elevated style={styles.drawCard}>
            <View style={styles.drawTop}>
              <DrawStatusBadge phase={phase} />
              <AppText size={12} weight="semibold" color={colors.onSun}>
                {formatRoundNumber(round?.contractRoundId)}
              </AppText>
            </View>
            <AppText
              variant="hero"
              color={colors.onSun}
              style={styles.drawTitle}
              accessibilityRole="header"
            >
              {t('Le grand tirage d’EtherBay.', 'The EtherBay grand draw.')}
            </AppText>
            <AppText variant="overline" color={colors.onSun} style={styles.prizeLabel}>
              {t('Cagnotte actuelle · ETH fictifs', 'Current prize pool · fictional ETH')}
            </AppText>
            <AppText variant="display" color={colors.onSun} numberOfLines={1} adjustsFontSizeToFit>
              {formatEth(round?.prizePool)}
            </AppText>
            <AppText size={11} weight="medium" color={colors.onSun} style={styles.prizeHint}>
              {maxPrize > 0
                ? t(
                    `La cagnotte et les lots des commerces pour le gagnant. Jusqu’à ${formatDecimal(maxPrize, maxPrize % 1 === 0 ? 0 : 2)} ETH fictifs si les ${formatInteger(participants.max)} places sont prises.`,
                    `The prize pool and local shop prizes for the winner. Up to ${formatDecimal(maxPrize, maxPrize % 1 === 0 ? 0 : 2)} fictional ETH if all ${formatInteger(participants.max)} spots are taken.`,
                  )
                : t(
                    'La cagnotte et les lots des commerces pour le gagnant.',
                    'The prize pool and local shop prizes for the winner.',
                  )}
            </AppText>
            {phase === 'OPEN' || phase === 'WAITING_ROOM' ? (
              <View style={styles.block}>
                <DeadlineCard
                  label={deadlineLabel}
                  seconds={seconds}
                  aside={
                    phase === 'OPEN' && participants.max > 0
                      ? t(
                          `ou dès ${formatInteger(participants.max)} participants`,
                          `or at ${formatInteger(participants.max)} participants`,
                        )
                      : undefined
                  }
                />
              </View>
            ) : null}
            <View style={styles.block}>
              <MilestonesPanel
                participants={participants.current}
                maxParticipants={participants.max}
                percentage={participants.percentage}
                milestones={status.progression.milestones ?? []}
              />
            </View>
            <View style={styles.cta}>{renderDrawCta()}</View>
            {phase === 'OPEN' && !ownTicket ? (
              <AppText
                size={10}
                weight="medium"
                color={colors.onSun}
                align="center"
                style={styles.ctaHint}
              >
                {t(
                  'En 1 clic · uniquement avec vos ETH fictifs',
                  'In 1 tap · only with your fictional ETH',
                )}
              </AppText>
            ) : null}
            {ownTicket ? (
              <AppText
                size={10}
                weight="medium"
                color={colors.onSun}
                align="center"
                style={styles.ctaHint}
              >
                {ownTicket.ticketNumber
                  ? t(
                      `Votre ticket n° ${ownTicket.ticketNumber} est validé.`,
                      `Your ticket no. ${ownTicket.ticketNumber} is confirmed.`,
                    )
                  : t(
                      'Votre ticket est validé pour ce tirage.',
                      'Your ticket is confirmed for this draw.',
                    )}
              </AppText>
            ) : null}
          </Card>
          <AppText size={10} weight="medium" color={colors.inkMuted} style={styles.calendar}>
            {t(
              `À 0:00 ou à ${formatInteger(participants.max)} inscrits : achats clos, salle ouverte. Puis 10 minutes dans la salle avant la révélation.`,
              `At midnight or at ${formatInteger(participants.max)} sign-ups: sales close, the room opens. Then 10 minutes in the room before the reveal.`,
            )}
          </AppText>
        </>
      )}

      <Card
        tone="mint"
        radius={22}
        style={styles.trustCard}
        onPress={() => navigation.navigate('HowItWorks')}
        accessibilityLabel={t(
          'Un jeu gratuit, pour votre ville. Comment se passe le tirage ?',
          'A free game for your city. How does the draw work?',
        )}
      >
        <AppText size={17} weight="bold">
          {t('Un jeu gratuit, pour votre ville.', 'A free game, for your city.')}
        </AppText>
        <AppText size={12} style={styles.trustBody}>
          {t(
            'Les règles sont les mêmes pour tous.\nLe résultat du tirage est vérifiable.\nLes lots viennent des commerces d’EtherBay.',
            'The rules are the same for everyone.\nThe draw result can be verified.\nPrizes come from EtherBay shops.',
          )}
        </AppText>
        <View style={styles.linkRow}>
          <AppText size={12} weight="semibold" color={colors.green}>
            {t('Comment se passe le tirage ?', 'How does the draw work?')}
          </AppText>
          <Icon name="arrowRight" size={16} color={colors.green} />
        </View>
      </Card>

      <SectionHeader title={t('Offrez un ticket à un proche.', 'Gift a ticket to a loved one.')} />
      <Card>
        <AppText size={13} color={colors.inkMuted}>
          {t(
            'Achetez un ticket pour la personne de votre choix : indiquez son e-mail, elle le reçoit pour ce grand tirage.',
            'Buy a ticket for someone you choose: enter their e-mail and they receive it for this grand draw.',
          )}
        </AppText>
        <View style={[styles.giftRow, { backgroundColor: colors.sunPale }]}>
          <Icon name="giftTicket" size={21} color={colors.onSun} />
          <AppText size={12} weight="semibold" color={colors.onSun} style={styles.flex}>
            {t('1 ticket offert', '1 gifted ticket')}
          </AppText>
          {ticketPrice > 0 ? (
            <AppText size={11} weight="semibold" color={colors.green}>
              {t(
                `${formatTicketPrice(ticketPrice)} ETH fictif`,
                `${formatTicketPrice(ticketPrice)} fictional ETH`,
              )}
            </AppText>
          ) : null}
        </View>
        <AppButton
          title={t('Offrir un ticket par e-mail', 'Gift a ticket by e-mail')}
          variant="dark"
          size="md"
          rightIcon="arrowSend"
          align="space-between"
          disabled={Boolean(round) && phase !== 'OPEN'}
          onPress={() => navigation.navigate('GiftTicket')}
        />
      </Card>

      <SectionHeader
        title={t('Les tickets à gratter', 'Scratch cards')}
        subtitle={t(
          'Grattez avec vos EtherPoints et découvrez votre lot.',
          'Scratch with your EtherPoints and reveal your prize.',
        )}
      />
      <View style={styles.scratchRow}>
        <ScratchOfferCard
          variant="violet"
          title={t('Le ticket violet', 'The violet ticket')}
          subtitle={t('Un bon chez un commerçant', 'A voucher at a local shop')}
          costPoints={SCRATCH_COSTS.violet}
          affordable={points >= SCRATCH_COSTS.violet}
          onPress={() => navigation.navigate('ScratchCard', { offer: 'violet' })}
        />
        <ScratchOfferCard
          variant="lucky"
          title={t('Le porte-bonheur', 'The lucky charm')}
          subtitle={t('Des lots plus généreux', 'More generous prizes')}
          costPoints={SCRATCH_COSTS.lucky}
          affordable={points >= SCRATCH_COSTS.lucky}
          onPress={() => navigation.navigate('ScratchCard', { offer: 'lucky' })}
        />
      </View>

      <SectionHeader
        title={t('Vos points, vos réductions.', 'Your points, your discounts.')}
        subtitle={t(
          'Tickets, invitations et missions → EtherPoints',
          'Tickets, invitations and missions → EtherPoints',
        )}
      />
      <Card
        onPress={() => navigation.navigate('RewardsCatalog')}
        accessibilityLabel={t(
          `${points} EtherPoints disponibles, voir les réductions`,
          `${points} EtherPoints available, view discounts`,
        )}
      >
        <AppText size={16} weight="bold">
          {t(
            `${formatInteger(points)} EtherPoints disponibles`,
            `${formatInteger(points)} EtherPoints available`,
          )}
        </AppText>
        <AppText size={11} color={colors.inkMuted} style={styles.pointsHint}>
          {t(
            'À échanger contre des réductions à EtherBay.',
            'Redeem them for discounts in EtherBay.',
          )}
        </AppText>
        {rewards.map((reward, index) => {
          const missing = reward.costInPoints - points;
          return (
            <View
              key={reward.id}
              style={[
                styles.rewardRow,
                { backgroundColor: index === 0 ? colors.sunChip : colors.lavenderSoft },
              ]}
            >
              <View style={styles.flex}>
                <AppText
                  size={12}
                  weight="semibold"
                  color={index === 0 ? colors.onSun : colors.ink}
                  numberOfLines={1}
                >
                  {reward.title} · {reward.partner.name}
                </AppText>
                <AppText size={10} color={index === 0 ? colors.onSunMuted : colors.inkMuted}>
                  {formatInteger(reward.costInPoints)} EtherPoints
                </AppText>
              </View>
              {missing <= 0 ? (
                <AppText size={11} weight="bold" color={index === 0 ? colors.onSun : colors.ink}>
                  {t('Échanger', 'Redeem')}
                </AppText>
              ) : (
                <AppText
                  size={10}
                  weight="medium"
                  color={index === 0 ? colors.onSunMuted : colors.inkMuted}
                >
                  {t(`Encore ${formatInteger(missing)} EP`, `${formatInteger(missing)} EP to go`)}
                </AppText>
              )}
            </View>
          );
        })}
        {catalogQuery.isSuccess && rewards.length === 0 ? (
          <AppText size={11} color={colors.inkMuted} style={styles.pointsHint}>
            {t('Les prochaines réductions arrivent bientôt.', 'New discounts are coming soon.')}
          </AppText>
        ) : null}
      </Card>
      {nextQuest ? (
        <Card
          tone="lavenderStrong"
          radius={17}
          padding={16}
          style={styles.questCard}
          onPress={() => navigation.navigate('Main', { screen: 'ProfileTab' })}
          accessibilityLabel={t(
            `Mission : ${nextQuest.title}, +${nextQuest.rewardPoints} EtherPoints`,
            `Mission: ${nextQuest.title}, +${nextQuest.rewardPoints} EtherPoints`,
          )}
        >
          <AppText size={13} weight="semibold">
            {t(`Mission : ${nextQuest.title}`, `Mission: ${nextQuest.title}`)}
          </AppText>
          <View style={styles.linkRow}>
            <AppText size={11} weight="medium" color={colors.inkMuted}>
              {t(
                `+${nextQuest.rewardPoints} EtherPoints · Commencer`,
                `+${nextQuest.rewardPoints} EtherPoints · Start`,
              )}
            </AppText>
            <Icon name="arrowRight" size={14} color={colors.inkMuted} />
          </View>
        </Card>
      ) : null}

      {referrals ? (
        <>
          <SectionHeader title={t('Invitez vos voisins.', 'Invite your neighbours.')} />
          <Card>
            <Pill label={t('Fidélité', 'Loyalty')} tone="lavender" />
            <AppText size={19} weight="bold" style={styles.referralTitle}>
              {t(
                'Un voisin vous rejoint ? Vous gagnez des EtherPoints.',
                'A neighbour joins? You earn EtherPoints.',
              )}
            </AppText>
            <AppText size={12} color={colors.inkMuted} style={styles.referralBody}>
              {t(
                'Chaque ami invité vous rapporte des points, des offres en ville et une place au classement.',
                'Every friend you invite earns you points, local offers and a spot on the leaderboard.',
              )}
            </AppText>
            <View style={[styles.codeRow, { backgroundColor: colors.surfaceMuted }]}>
              <AppText
                size={16}
                weight="bold"
                style={styles.flex}
                selectable
                accessibilityLabel={t(
                  `Votre code de parrainage : ${referrals.referralCode}`,
                  `Your referral code: ${referrals.referralCode}`,
                )}
              >
                {referrals.referralCode}
              </AppText>
              <AppButton
                title={t('Partager', 'Share')}
                variant="dark"
                size="md"
                rightIcon="share"
                align="space-between"
                fullWidth={false}
                style={styles.shareButton}
                onPress={shareReferral}
              />
            </View>
          </Card>
          <Card
            tone="lavenderStrong"
            radius={18}
            padding={15}
            style={styles.clubCard}
            onPress={() => navigation.navigate('Main', { screen: 'SponsorsTab' })}
            accessibilityLabel={t(
              'Le club des parrains, voir le classement',
              'The referral club, view the leaderboard',
            )}
          >
            <View style={styles.clubRow}>
              <Icon name="trophy" size={25} color={colors.ink} />
              <View style={styles.flex}>
                <AppText size={14} weight="bold">
                  {t('Le club des parrains', 'The referral club')}
                </AppText>
                <AppText size={12} weight="medium" color={colors.inkMuted}>
                  {t(
                    `${formatInteger(referrals.referralsCount)} voisin${referrals.referralsCount > 1 ? 's' : ''} invité${referrals.referralsCount > 1 ? 's' : ''} · ${formatInteger(points)} points`,
                    `${formatInteger(referrals.referralsCount)} neighbour${referrals.referralsCount === 1 ? '' : 's'} invited · ${formatInteger(points)} points`,
                  )}
                </AppText>
              </View>
              <Icon name="chevronRight" size={19} color={colors.ink} />
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 26,
  },
  walletCard: {
    paddingTop: 16,
  },
  walletRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginHorizontal: -4,
  },
  walletTile: {
    flex: 1,
    minHeight: 85,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 6,
  },
  walletNote: {
    marginTop: 14,
  },
  walletHint: {
    marginTop: 8,
  },
  drawCard: {
    marginTop: 20,
  },
  drawTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawTitle: {
    marginTop: 14,
  },
  prizeLabel: {
    marginTop: 14,
  },
  prizeHint: {
    marginTop: 4,
  },
  block: {
    marginTop: 14,
    marginHorizontal: -2,
  },
  cta: {
    marginTop: 14,
    marginHorizontal: -2,
  },
  ctaHint: {
    marginTop: 6,
  },
  calendar: {
    marginTop: 10,
    marginHorizontal: 4,
  },
  errorText: {
    marginTop: 6,
    marginBottom: 14,
  },
  trustCard: {
    marginTop: 30,
    paddingTop: 16,
  },
  trustBody: {
    marginTop: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 43,
    borderRadius: 12,
    paddingHorizontal: 11,
    marginTop: 14,
    marginBottom: 12,
  },
  flex: {
    flex: 1,
  },
  scratchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pointsHint: {
    marginTop: 6,
    marginBottom: 4,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 7,
    marginHorizontal: -4,
  },
  questCard: {
    marginTop: 12,
  },
  referralTitle: {
    marginTop: 14,
  },
  referralBody: {
    marginTop: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingLeft: 13,
    paddingRight: 6,
    paddingVertical: 6,
    marginTop: 16,
  },
  shareButton: {
    minWidth: 136,
  },
  clubCard: {
    marginTop: 12,
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
});

export default HomeScreen;
