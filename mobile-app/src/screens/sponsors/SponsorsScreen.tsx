import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getApiErrorMessage } from '../../components/marketplace/apiErrors';
import ListGroup from '../../components/profile/ListGroup';
import ReferralCodeCard from '../../components/profile/ReferralCodeCard';
import TabTitle from '../../components/profile/TabTitle';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import ListRow from '../../components/ui/ListRow';
import Pill from '../../components/ui/Pill';
import Screen from '../../components/ui/Screen';
import SectionHeader from '../../components/ui/SectionHeader';
import StepList from '../../components/ui/StepList';
import Icon from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import usePoints from '../../hooks/usePoints';
import { useAppDispatch } from '../../store';
import {
  useCompleteQuestMutation,
  useGetQuestsQuery,
  useGetReferralsQuery,
} from '../../store/api/authApi';
import { useGetLeaderboardQuery } from '../../store/api/lotteryApi';
import { showPointsPopup } from '../../store/slices/uiSlice';

const REFERRER_REWARD = 100;
const REFERRED_REWARD = 50;
const PREVIEW_COUNT = 5;

const anonymize = (wallet?: string | null): string =>
  wallet && wallet.length >= 10 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : (wallet ?? '');

const SponsorsScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { setPointsBalance } = usePoints();
  const referralsQuery = useGetReferralsQuery();
  const leaderboardQuery = useGetLeaderboardQuery();
  const questsQuery = useGetQuestsQuery();
  const [completeQuest] = useCompleteQuestMutation();
  const [pendingQuest, setPendingQuest] = useState<string | null>(null);
  const [questError, setQuestError] = useState('');
  const [showAll, setShowAll] = useState(false);

  const referral = referralsQuery.data?.data;
  const code = referral?.referralCode || user?.referralCode;
  const referralsCount = referral?.referralsCount ?? user?.stats?.referralsCount;
  const rawLeaderboard = leaderboardQuery.data?.data?.leaderboard;
  const leaderboard = Array.isArray(rawLeaderboard) ? rawLeaderboard : [];
  const rawQuests = questsQuery.data?.data?.quests;
  const quests = Array.isArray(rawQuests) ? rawQuests : [];
  const myWallet = anonymize(user?.walletAddress);
  const myEntry = myWallet
    ? leaderboard.find((entry) => entry.anonymizedWallet === myWallet)
    : undefined;
  const visibleEntries = showAll ? leaderboard : leaderboard.slice(0, PREVIEW_COUNT);

  const refreshing =
    referralsQuery.isFetching || leaderboardQuery.isFetching || questsQuery.isFetching;
  const onRefresh = () => {
    referralsQuery.refetch();
    leaderboardQuery.refetch();
    questsQuery.refetch();
  };

  const handleQuest = async (questId: string) => {
    if (pendingQuest) return;
    setPendingQuest(questId);
    setQuestError('');
    try {
      const res = await completeQuest({ questId }).unwrap();
      setPointsBalance(res.data.newPointsBalance);
      dispatch(
        showPointsPopup({
          amount: res.data.pointsAwarded,
          reason: t(
            `Mission accomplie : ${res.data.quest.title}`,
            `Quest completed: ${res.data.quest.title}`,
          ),
        }),
      );
    } catch (error) {
      setQuestError(
        getApiErrorMessage(
          error,
          t('Impossible de valider cette mission.', 'Unable to complete this quest.'),
        ),
      );
    } finally {
      setPendingQuest(null);
    }
  };

  const rankLabel = myEntry
    ? t(
        `Vous êtes ${myEntry.rank}${myEntry.rank === 1 ? 'er' : 'e'} · ${myEntry.pointsBalance} points`,
        `You are #${myEntry.rank} · ${myEntry.pointsBalance} points`,
      )
    : t(
        `Hors du top ${leaderboard.length || 20} pour l’instant`,
        `Outside the top ${leaderboard.length || 20} for now`,
      );

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <TabTitle
        title={t('Parrains', 'Referrals')}
        subtitle={t(
          'Invitez vos voisins, gagnez des EtherPoints',
          'Invite your neighbours, earn EtherPoints',
        )}
      />

      {code ? (
        <ReferralCodeCard code={code} link={referral?.referralLink} />
      ) : referralsQuery.isLoading ? (
        <Card style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </Card>
      ) : (
        <Card>
          <AppText size={13} color={colors.inkMuted}>
            {getApiErrorMessage(
              referralsQuery.error,
              t('Votre code de parrainage est indisponible.', 'Your referral code is unavailable.'),
            )}
          </AppText>
        </Card>
      )}

      {typeof referralsCount === 'number' ? (
        <View style={styles.stats}>
          <Card tone="lavender" radius={18} padding={14} style={styles.stat}>
            <AppText size={24} weight="bold" color={colors.violet}>
              {referralsCount}
            </AppText>
            <AppText size={11} color={colors.ink}>
              {referralsCount > 1
                ? t('voisins parrainés', 'neighbours referred')
                : t('voisin parrainé', 'neighbour referred')}
            </AppText>
          </Card>
          <Card tone="mint" radius={18} padding={14} style={styles.stat}>
            <AppText size={24} weight="bold" color={colors.green}>
              {`+${referralsCount * REFERRER_REWARD}`}
            </AppText>
            <AppText size={11} color={colors.ink}>
              {t('EtherPoints gagnés', 'EtherPoints earned')}
            </AppText>
          </Card>
        </View>
      ) : null}

      <SectionHeader title={t('Comment ça marche', 'How it works')} />
      <Card tone="lavender">
        <StepList
          variant="badge"
          steps={[
            {
              title: t('Partagez votre code', 'Share your code'),
              description: t(
                'Par message, e-mail ou de vive voix.',
                'By message, e-mail or in person.',
              ),
            },
            {
              title: t('Votre voisin s’inscrit', 'Your neighbour signs up'),
              description: t(
                'Il saisit votre code lors de son inscription.',
                'They enter your code when signing up.',
              ),
            },
            {
              title: t('Vous gagnez tous les deux', 'You both win'),
              description: t(
                `${REFERRER_REWARD} EtherPoints pour vous, ${REFERRED_REWARD} pour lui.`,
                `${REFERRER_REWARD} EtherPoints for you, ${REFERRED_REWARD} for them.`,
              ),
            },
          ]}
        />
      </Card>

      <SectionHeader
        title={t('Le club des parrains', 'The referral club')}
        subtitle={t('Classement des citoyens par EtherPoints', 'Citizens ranked by EtherPoints')}
      />
      <Card tone="lavender" radius={18} padding={16}>
        <View style={styles.clubHead}>
          <Icon name="trophy" size={25} color={colors.violet} />
          <View style={styles.flex}>
            <AppText size={14} weight="bold">
              {t('Votre position', 'Your position')}
            </AppText>
            <AppText size={12} weight="medium" color={colors.inkMuted}>
              {leaderboardQuery.isLoading ? t('Chargement...', 'Loading...') : rankLabel}
            </AppText>
          </View>
        </View>
      </Card>

      {leaderboard.length > 0 ? (
        <ListGroup style={styles.leaderboard}>
          {visibleEntries.map((entry, index) => {
            const isMe = myEntry?.rank === entry.rank;
            return (
              <View
                key={`${entry.rank}-${entry.anonymizedWallet}`}
                style={[
                  styles.rankRow,
                  index < visibleEntries.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: colors.divider }
                    : null,
                ]}
              >
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: entry.rank <= 3 ? colors.sun : colors.surfaceMuted },
                  ]}
                >
                  <AppText
                    size={12}
                    weight="bold"
                    color={entry.rank <= 3 ? colors.onSun : colors.ink}
                  >
                    {entry.rank}
                  </AppText>
                </View>
                <View style={styles.flex}>
                  <AppText size={13} weight={isMe ? 'bold' : 'semibold'}>
                    {isMe ? t('Vous', 'You') : entry.anonymizedWallet}
                  </AppText>
                  <AppText size={11} color={colors.inkMuted}>
                    {entry.referralsCount > 1
                      ? t(`${entry.referralsCount} filleuls`, `${entry.referralsCount} referrals`)
                      : t(`${entry.referralsCount} filleul`, `${entry.referralsCount} referral`)}
                  </AppText>
                </View>
                <AppText size={12} weight="bold">
                  {`${entry.pointsBalance} EP`}
                </AppText>
              </View>
            );
          })}
        </ListGroup>
      ) : !leaderboardQuery.isLoading ? (
        <AppText size={12} color={colors.inkMuted} style={styles.empty}>
          {leaderboardQuery.isError
            ? getApiErrorMessage(
                leaderboardQuery.error,
                t('Classement indisponible pour le moment.', 'Leaderboard unavailable right now.'),
              )
            : t(
                'Le classement est encore vide. Soyez le premier !',
                'The leaderboard is still empty. Be the first!',
              )}
        </AppText>
      ) : null}
      {leaderboard.length > PREVIEW_COUNT ? (
        <AppButton
          title={
            showAll
              ? t('Afficher moins', 'Show less')
              : t('Voir tout le classement', 'See the full leaderboard')
          }
          variant="ghost"
          size="md"
          onPress={() => setShowAll((value) => !value)}
        />
      ) : null}

      {quests.length > 0 ? (
        <>
          <SectionHeader
            title={t('Missions', 'Quests')}
            subtitle={t(
              'Des EtherPoints en plus, une seule fois par mission',
              'Extra EtherPoints, once per quest',
            )}
          />
          <ListGroup>
            {quests.map((quest, index) => (
              <ListRow
                key={quest.id}
                title={quest.title}
                subtitle={`+${quest.rewardPoints} EtherPoints`}
                icon={quest.completed ? 'check' : 'star'}
                iconTone={quest.completed ? 'mint' : 'sun'}
                divider={index < quests.length - 1}
                right={
                  quest.completed ? (
                    <Pill label={t('Fait', 'Done')} tone="mint" />
                  ) : (
                    <AppButton
                      title={t('Valider', 'Complete')}
                      variant="dark"
                      size="sm"
                      fullWidth={false}
                      loading={pendingQuest === quest.id}
                      disabled={Boolean(pendingQuest) && pendingQuest !== quest.id}
                      onPress={() => handleQuest(quest.id)}
                      style={styles.questButton}
                    />
                  )
                }
              />
            ))}
          </ListGroup>
          {questError ? (
            <AppText
              size={12}
              color={colors.terracotta}
              style={styles.empty}
              accessibilityRole="alert"
            >
              {questError}
            </AppText>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  clubHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  leaderboard: {
    marginTop: 12,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    marginTop: 12,
  },
  questButton: {
    minHeight: 44,
  },
});

export default SponsorsScreen;
