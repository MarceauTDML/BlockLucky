import React from 'react';
import { View, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import { PoapBadge } from '../../types/api.types';
import { formatDateShort } from '../../utils/date.util';

export interface POAPBadgeProps {
  badge: PoapBadge;
}

export const POAPBadge: React.FC<POAPBadgeProps> = ({ badge }) => {
  const { colors, borderRadius } = useAppTheme();

  return (
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
      <View
        style={[
          styles.emblemBox,
          {
            backgroundColor: colors.surfaceElevated,
            borderRadius: borderRadius.md,
          },
        ]}
      >
        <AppText variant="caption" weight="bold" color={colors.secondary}>
          POAP
        </AppText>
      </View>

      <View style={styles.infoCol}>
        <AppText variant="body" weight="bold">
          {badge.title}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {badge.edition} • Token #{badge.tokenId}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {formatDateShort(badge.mintedAt)}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  emblemBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
});

export default POAPBadge;
