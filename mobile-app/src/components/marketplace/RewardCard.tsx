import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import { RewardItem } from '../../types/api.types';

export interface RewardCardProps {
  reward: RewardItem;
  onPress: () => void;
}

export const RewardCard: React.FC<RewardCardProps> = ({ reward, onPress }) => {
  const { colors, borderRadius, t } = useAppTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.partnerAvatar,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <AppText variant="caption" weight="bold" color={colors.primary}>
            {reward.partner.name.slice(0, 2).toUpperCase()}
          </AppText>
        </View>
        <View style={styles.partnerCol}>
          <AppText variant="caption" color={colors.textMuted}>
            {reward.partner.name}
          </AppText>
          <AppText variant="body" weight="bold">
            {reward.title}
          </AppText>
        </View>
      </View>

      <View
        style={[
          styles.stockBarTrack,
          { backgroundColor: colors.surfaceElevated },
        ]}
      >
        <View
          style={[
            styles.stockBarFill,
            {
              width: `${Math.max(5, reward.stockPercentage)}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
      </View>

      <View style={styles.footerRow}>
        <AppText variant="caption" color={colors.textSecondary}>
          {t(
            `${reward.remainingStock} / ${reward.totalStock} restants`,
            `${reward.remainingStock} / ${reward.totalStock} left`
          )}
        </AppText>
        <View
          style={[
            styles.costPill,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: borderRadius.sm,
            },
          ]}
        >
          <AppText variant="caption" weight="bold" color={colors.secondary}>
            {reward.costInPoints} pts
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  partnerAvatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  partnerCol: {
    flex: 1,
  },
  stockBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  stockBarFill: {
    height: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});

export default RewardCard;
