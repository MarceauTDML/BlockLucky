import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import usePoints from '../../hooks/usePoints';
import useGaslessWeb3 from '../../hooks/useGaslessWeb3';
import usePushNotifications from '../../hooks/usePushNotifications';
import {
  useGetLotteryStatusQuery,
  useGetLeaderboardQuery,
} from '../../store/api/lotteryApi';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import Loader from '../../components/ui/Loader';
import ProgressBar from '../../components/ui/ProgressBar';
import CountdownTimer from '../../components/lottery/CountdownTimer';
import LeaderboardList from '../../components/lottery/LeaderboardList';
import WalletConnectButton from '../../components/web3/WalletConnectButton';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, borderRadius, spacing, t } = useAppTheme();
  const { user } = useAuth();
  const { pointsBalance } = usePoints();
  const { purchaseGaslessTicket, isBuying } = useGaslessWeb3();
  const { unreadCount, openDrawer } = usePushNotifications();

  const { data: statusRes, isLoading, refetch } = useGetLotteryStatusQuery();
  const { data: leaderboardRes } = useGetLeaderboardQuery();

  const statusData = statusRes?.data;
  const rawLeaderboard = leaderboardRes?.data?.leaderboard;
  const leaderboard = Array.isArray(rawLeaderboard) ? rawLeaderboard : [];

  const handleQuickGaslessBuy = async () => {
    await purchaseGaslessTicket(1, 0);
    refetch();
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { padding: spacing.md, paddingBottom: spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topHeader}>
          <WalletConnectButton
            walletAddress={user?.walletAddress}
            providerLabel={t('Portefeuille', 'Wallet')}
            onPress={() => navigation.navigate('TransactionHistory')}
          />

          <View style={styles.rightHeaderRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('MarketplaceTab')}
              style={[
                styles.pointsBadge,
                {
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.md,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppText variant="caption" weight="semibold" color={colors.secondary}>
                {Number(pointsBalance || 0)} pts
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openDrawer}
              style={[
                styles.notifBtn,
                {
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.md,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppText variant="caption" weight="medium" color={colors.text}>
                {t(`Alertes (${unreadCount})`, `Alerts (${unreadCount})`)}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {statusData?.network ? (
          <View
            style={[
              styles.networkPill,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: statusData.network.fallbackActive
                    ? colors.warning
                    : colors.success,
                },
              ]}
            />
            <AppText variant="caption" color={colors.textSecondary}>
              {statusData.network.fallbackActive
                ? t('Relais secondaire actif', 'Fallback node active')
                : t(
                    `Réseau Ethereum synchronisé (${statusData.network.latencyMs}ms)`,
                    `Ethereum node synced (${statusData.network.latencyMs}ms)`
                  )}
            </AppText>
          </View>
        ) : null}

        {isLoading && !statusData ? (
          <Loader
            message={t(
              'Synchronisation avec le Smart Contract...',
              'Syncing with Smart Contract...'
            )}
          />
        ) : (
          <>
            <CountdownTimer
              initialSeconds={statusData?.round.remainingSeconds ?? 86400}
              prizePoolEth={statusData?.round.prizePool ?? 1.25}
              roundNumber={statusData?.round.contractRoundId ?? 1}
            />

            <View
              style={[
                styles.refundBadge,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <AppText variant="caption" weight="semibold" color={colors.primary}>
                {t('Garantie Smart Contract', 'Smart Contract Guarantee')}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {t(
                  statusData?.guarantees.autoRefundPolicy ||
                    'Remboursement automatique intégral si le tirage est annulé.',
                  'Automatic 100% refund guaranteed if the draw is cancelled.'
                )}
              </AppText>
            </View>

            <View style={styles.ctaGroup}>
              <AppButton
                title={t(
                  'Acheter 1 ticket (Sans frais réseau)',
                  'Buy 1 ticket (Zero gas fees)'
                )}
                onPress={handleQuickGaslessBuy}
                loading={isBuying}
              />
              <View style={styles.secondaryCtaRow}>
                <AppButton
                  title={t('Offrir un ticket', 'Gift a ticket')}
                  variant="secondary"
                  onPress={() =>
                    navigation.navigate('BuyTicket', { giftMode: true })
                  }
                  style={styles.halfBtn}
                />
                <AppButton
                  title={t('Salle de tirage', 'Live Draw Room')}
                  variant="outline"
                  onPress={() => navigation.navigate('LiveDrawTab')}
                  style={styles.halfBtn}
                />
              </View>
            </View>

            <ProgressBar
              percentage={statusData?.progression.percentage ?? 15}
              currentValue={statusData?.progression.ticketsSold ?? 1500}
              targetValue={statusData?.progression.targetParticipants ?? 10000}
              milestones={statusData?.progression.milestones ?? []}
            />

            <LeaderboardList entries={leaderboard} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {},
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  rightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  notifBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  refundBadge: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 4,
  },
  ctaGroup: {
    gap: 10,
    marginBottom: 18,
  },
  secondaryCtaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfBtn: {
    flex: 1,
  },
});

export default HomeScreen;
