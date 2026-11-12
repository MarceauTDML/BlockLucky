import React from 'react';
import { StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import { LotteryPhase } from '../../types/api.types';
import AppText from '../ui/AppText';

export interface DrawStatusBadgeProps {
  phase?: LotteryPhase;
  label?: string;
}

export const DrawStatusBadge: React.FC<DrawStatusBadgeProps> = ({ phase = 'OPEN', label }) => {
  const { colors, t } = useAppTheme();
  const labels: Record<LotteryPhase, string> = {
    OPEN: t('Tirage en cours', 'Draw open'),
    WAITING_ROOM: t('Salle d’attente ouverte', 'Waiting room open'),
    DRAWING: t('Tirage en direct', 'Live draw'),
    COMPLETED: t('Tirage terminé', 'Draw completed'),
    CANCELLED: t('Tirage annulé', 'Draw cancelled'),
  };
  const showDot = !label && (phase === 'OPEN' || phase === 'WAITING_ROOM' || phase === 'DRAWING');

  return (
    <View style={[styles.badge, { backgroundColor: colors.onSun }]}>
      {showDot ? <View style={[styles.dot, { backgroundColor: colors.sunChip }]} /> : null}
      <AppText size={10} weight="bold" color={colors.sunChip} style={styles.text}>
        {label ?? labels[phase]}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 13,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
});

export default DrawStatusBadge;
