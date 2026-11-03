import React from 'react';
import { View, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from './AppText';
import { Milestone } from '../../types/api.types';

export interface ProgressBarProps {
  percentage: number;
  currentValue: number;
  targetValue: number;
  milestones?: Milestone[];
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  currentValue,
  targetValue,
  milestones = [],
}) => {
  const { colors, borderRadius, t } = useAppTheme();
  const clamped = Math.max(2, Math.min(100, percentage));

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
      <View style={styles.headerRow}>
        <AppText variant="body" weight="bold">
          {t('Participation citoyenne', 'Community Participation')}
        </AppText>
        <AppText variant="caption" weight="bold" color={colors.secondary}>
          {Number(currentValue || 0)} / {Number(targetValue || 10000)}
        </AppText>
      </View>

      <View
        style={[
          styles.track,
          {
            backgroundColor: colors.surfaceElevated,
            borderRadius: borderRadius.full,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${clamped}%`,
              backgroundColor: colors.primary,
              borderRadius: borderRadius.full,
            },
          ]}
        />
      </View>

      {milestones.length > 0 ? (
        <View style={styles.milestonesContainer}>
          {milestones.map((m) => (
            <View
              key={m.target}
              style={[
                styles.milestoneRow,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: borderRadius.sm,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: m.unlocked ? colors.primary : colors.border,
                  },
                ]}
              />
              <View style={styles.milestoneTextCol}>
                <AppText variant="caption" weight="bold">
                  {m.title}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {m.rewardDescription}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  track: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 12,
  },
  fill: {
    height: '100%',
  },
  milestonesContainer: {
    gap: 6,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  milestoneTextCol: {
    flex: 1,
  },
});

export default ProgressBar;
