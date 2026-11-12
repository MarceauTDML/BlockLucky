import React from 'react';
import { StyleSheet, View } from 'react-native';

import { formatDuration } from './lotteryFormat';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';

export interface DeadlineCardProps {
  label: string;
  seconds: number | null;
  aside?: string;
}

export const DeadlineCard: React.FC<DeadlineCardProps> = ({ label, seconds, aside }) => {
  const { colors, t } = useAppTheme();
  const value = seconds === null ? '—' : formatDuration(seconds);

  return (
    <View
      style={[styles.box, { backgroundColor: colors.sunPale }]}
      accessible
      accessibilityLabel={aside ? `${label} ${value}, ${aside}` : `${label} ${value}`}
    >
      <AppText variant="label" color={colors.onSun}>
        {label}
      </AppText>
      <View style={styles.row}>
        <AppText size={24} weight="bold" color={colors.onSun} style={styles.value}>
          {seconds === 0 ? t('Clôture imminente', 'Closing now') : value}
        </AppText>
        {aside ? (
          <AppText size={10} weight="medium" color={colors.onSun} style={styles.aside}>
            {aside}
          </AppText>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 10,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    flexShrink: 0,
  },
  aside: {
    flex: 1,
    textAlign: 'right',
  },
});

export default DeadlineCard;
