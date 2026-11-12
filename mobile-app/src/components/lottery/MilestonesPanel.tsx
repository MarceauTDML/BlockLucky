import React from 'react';
import { StyleSheet, View } from 'react-native';

import { formatInteger, formatPercent, shortMilestoneTitle } from './lotteryFormat';
import useAppTheme from '../../hooks/useAppTheme';
import { Milestone } from '../../types/api.types';
import AppText from '../ui/AppText';
import ProgressBar from '../ui/ProgressBar';

export interface MilestonesPanelProps {
  participants: number;
  maxParticipants: number;
  percentage: number;
  milestones: Milestone[];
}

export const MilestonesPanel: React.FC<MilestonesPanelProps> = ({
  participants,
  maxParticipants,
  percentage,
  milestones,
}) => {
  const { colors, t } = useAppTheme();
  const sorted = [...milestones].sort((a, b) => a.target - b.target);
  const reachedFor = (milestone: Milestone) =>
    milestone.unlocked || participants >= milestone.target;
  const next = sorted.find((milestone) => !reachedFor(milestone));
  const remaining = Math.max(0, maxParticipants - participants);
  const markers =
    maxParticipants > 0
      ? sorted.map((milestone) => ({
          at: (milestone.target / maxParticipants) * 100,
          reached: reachedFor(milestone),
        }))
      : [];

  return (
    <View style={[styles.panel, { backgroundColor: colors.sunLight }]}>
      <View style={styles.headRow}>
        <AppText size={16} weight="bold" color={colors.onSun} style={styles.flex}>
          {formatInteger(participants)} / {formatInteger(maxParticipants)}
        </AppText>
        <AppText size={12} weight="bold" color={colors.onSun}>
          {formatPercent(Number(percentage.toFixed(1)))}
        </AppText>
      </View>
      <AppText size={11} weight="medium" color={colors.onSun}>
        {t(
          `participants · ${formatInteger(remaining)} places restantes`,
          `participants · ${formatInteger(remaining)} spots left`,
        )}
      </AppText>
      <View style={styles.bar}>
        <ProgressBar
          percentage={percentage}
          markers={markers}
          height={9}
          accessibilityLabel={t(
            `${formatInteger(participants)} participants sur ${formatInteger(maxParticipants)}`,
            `${formatInteger(participants)} participants out of ${formatInteger(maxParticipants)}`,
          )}
        />
      </View>
      {next ? (
        <AppText size={12} weight="semibold" color={colors.onSun}>
          {t(
            `Encore ${formatInteger(next.target - participants)} participants avant le prochain palier !`,
            `${formatInteger(next.target - participants)} more participants until the next milestone!`,
          )}
        </AppText>
      ) : null}
      {sorted.length > 0 ? (
        <View style={styles.grid}>
          {sorted.map((milestone) => {
            const reached = reachedFor(milestone);
            const isNext = next?.target === milestone.target;
            const isLimit = !reached && !isNext && milestone.target >= maxParticipants;
            const background = isNext ? colors.onSun : reached ? colors.sunChip : colors.sunSoft;
            const statusColor = isNext ? colors.sun : reached ? colors.green : colors.onSunMuted;
            const status = reached
              ? t('Atteint', 'Reached')
              : isNext
                ? t('Prochain', 'Next')
                : isLimit
                  ? t('Limite', 'Limit')
                  : t('À venir', 'Upcoming');
            return (
              <View
                key={milestone.target}
                style={[styles.chip, { backgroundColor: background }]}
                accessible
                accessibilityLabel={`${formatInteger(milestone.target)}, ${status}, ${milestone.title}. ${milestone.rewardDescription}`}
              >
                <AppText size={9} weight="bold" color={statusColor} style={styles.upper}>
                  {formatInteger(milestone.target)} · {status}
                </AppText>
                <AppText
                  size={10}
                  weight="semibold"
                  color={isNext ? colors.sunChip : colors.onSun}
                  numberOfLines={2}
                >
                  {shortMilestoneTitle(milestone.title)}
                </AppText>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderRadius: 18,
    padding: 14,
    paddingTop: 12,
    gap: 2,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  bar: {
    marginTop: 12,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 7,
    marginTop: 12,
  },
  chip: {
    width: '48.5%',
    minHeight: 43,
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 2,
  },
  upper: {
    textTransform: 'uppercase',
  },
});

export default MilestonesPanel;
