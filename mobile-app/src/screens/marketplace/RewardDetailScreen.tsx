import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppTheme from '../../hooks/useAppTheme';
import usePoints from '../../hooks/usePoints';
import { useAppDispatch } from '../../store';
import { updateUserPoints } from '../../store/slices/authSlice';
import {
  useGetRewardDetailQuery,
  useClaimRewardMutation,
} from '../../store/api/marketplaceApi';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import BackButton from '../../components/ui/BackButton';
import Loader from '../../components/ui/Loader';

export const RewardDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { rewardId } = route.params;
  const { colors, borderRadius, spacing, t } = useAppTheme();
  const dispatch = useAppDispatch();
  const { pointsBalance } = usePoints();

  const { data, isLoading } = useGetRewardDetailQuery(rewardId);
  const [claimReward, { isLoading: isClaiming }] = useClaimRewardMutation();
  const [errorMessage, setErrorMessage] = useState('');

  const reward = data?.data?.reward;

  const handleClaim = async () => {
    setErrorMessage('');
    try {
      const res = await claimReward({ rewardId }).unwrap();
      dispatch(updateUserPoints(res.data.newPointsBalance));
      navigation.replace('ScratchCard', { claim: res.data.claim });
    } catch (err: any) {
      setErrorMessage(
        err?.data?.message ||
          t(
            'Impossible de débloquer cette offre. Vérifiez votre solde de points.',
            'Unable to unlock this offer. Please check your points balance.'
          )
      );
    }
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
          { padding: spacing.lg, paddingBottom: spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => navigation.goBack()} />

        {isLoading || !reward ? (
          <Loader
            message={t('Chargement de l offre...', 'Loading offer details...')}
          />
        ) : (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                borderColor: colors.border,
              },
            ]}
          >
            <AppText variant="overline" weight="semibold" color={colors.secondary}>
              {reward.partner.name}
            </AppText>
            <AppText variant="title" weight="bold" style={styles.title}>
              {reward.title}
            </AppText>

            <View
              style={[
                styles.costBox,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <AppText variant="caption" color={colors.textSecondary}>
                {t('Coût de l offre', 'Offer cost')}
              </AppText>
              <AppText variant="subtitle" weight="bold" color={colors.primary}>
                {t(
                  `${reward.costInPoints} pts (Solde : ${pointsBalance} pts)`,
                  `${reward.costInPoints} pts (Balance: ${pointsBalance} pts)`
                )}
              </AppText>
            </View>

            <View style={styles.stockSection}>
              <View style={styles.stockRow}>
                <AppText variant="caption" color={colors.textSecondary}>
                  {t('Disponibilité', 'Availability')}
                </AppText>
                <AppText variant="caption" weight="semibold" color={colors.text}>
                  {t(
                    `${reward.remainingStock} / ${reward.totalStock} codes restants`,
                    `${reward.remainingStock} / ${reward.totalStock} codes left`
                  )}
                </AppText>
              </View>
              <View
                style={[
                  styles.stockTrack,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <View
                  style={[
                    styles.stockFill,
                    {
                      width: `${Math.max(4, reward.stockPercentage)}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
            </View>

            {errorMessage ? (
              <AppText variant="caption" color={colors.error}>
                {errorMessage}
              </AppText>
            ) : null}

            <AppButton
              title={t(
                `Débloquer la carte (${reward.costInPoints} pts)`,
                `Unlock Scratch Card (${reward.costInPoints} pts)`
              )}
              onPress={handleClaim}
              loading={isClaiming}
              disabled={reward.remainingStock <= 0}
            />
          </View>
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
  card: {
    padding: 20,
    borderWidth: 1,
    gap: 14,
  },
  title: {
    marginVertical: 2,
  },
  costBox: {
    padding: 14,
    gap: 4,
  },
  stockSection: {
    gap: 8,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  stockFill: {
    height: '100%',
  },
});

export default RewardDetailScreen;
