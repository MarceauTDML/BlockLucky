import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import { formatRemainingTime } from '../../utils/date.util';

export interface CountdownTimerProps {
  initialSeconds: number;
  prizePoolEth: number;
  roundNumber: number;
  vrfCertified?: boolean;
  simulated?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  initialSeconds,
  prizePoolEth,
  roundNumber,
  vrfCertified = false,
  simulated = false,
}) => {
  const { colors, borderRadius, t } = useAppTheme();
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { hours, minutes, seconds } = formatRemainingTime(secondsLeft);

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <AppText variant="caption" weight="medium" color={colors.textSecondary}>
          {t(`Tirage municipal #${roundNumber}`, `City Draw #${roundNumber}`)}
        </AppText>
        <View
          style={[
            styles.tag,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: borderRadius.sm,
            },
          ]}
        >
          <AppText
            variant="caption"
            weight="medium"
            color={simulated ? colors.textMuted : colors.primary}
          >
            {simulated
              ? t('Mode démonstration', 'Demo mode')
              : vrfCertified
                ? 'Chainlink VRF'
                : 'Smart Contract'}
          </AppText>
        </View>
      </View>

      <View style={styles.mainMetrics}>
        <View>
          <AppText variant="caption" color={colors.textMuted}>
            {t('Cagnotte actuelle', 'Current Prize Pool')}
          </AppText>
          <AppText variant="hero" weight="bold" color={colors.textPrimary}>
            {Number(prizePoolEth || 0).toFixed(2)} ETH
          </AppText>
        </View>

        <View
          style={[
            styles.timerPill,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <AppText variant="caption" color={colors.textSecondary}>
            {t('Échéance', 'Time Left')}
          </AppText>
          <AppText variant="subtitle" weight="bold" color={colors.secondary}>
            {hours}h {minutes}m {seconds}s
          </AppText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mainMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  timerPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
});

export default CountdownTimer;
