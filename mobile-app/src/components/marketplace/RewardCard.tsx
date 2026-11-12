import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import { RewardItem } from '../../types/api.types';
import AppText from '../ui/AppText';

export interface RewardCardProps {
  reward: RewardItem;
  pointsBalance: number;
  tone?: 'sun' | 'lavender';
  onPress: () => void;
}

export const RewardCard: React.FC<RewardCardProps> = ({
  reward,
  pointsBalance,
  tone = 'sun',
  onPress,
}) => {
  const { colors, t } = useAppTheme();
  const missing = Math.max(0, reward.costInPoints - pointsBalance);
  const soldOut = reward.remainingStock <= 0;
  const isSun = tone === 'sun';
  const background = isSun ? colors.sunPale : colors.lavenderSoft;
  const textColor = isSun ? colors.onSun : colors.ink;
  const mutedColor = isSun ? colors.onSunMuted : colors.inkMuted;

  const status = soldOut
    ? t('Épuisé', 'Sold out')
    : missing > 0
      ? t(`Encore ${missing} EP`, `${missing} EP to go`)
      : t('Échanger', 'Exchange');
  const actionable = !soldOut && missing === 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${reward.title}, ${reward.partner.name}, ${reward.costInPoints} EtherPoints. ${status}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: background, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.text}>
        <AppText size={12} weight="semibold" color={textColor} numberOfLines={2}>
          {`${reward.title} · ${reward.partner.name}`}
        </AppText>
        <AppText size={10} color={mutedColor}>
          {`${reward.costInPoints} EtherPoints`}
        </AppText>
      </View>
      <AppText
        size={actionable ? 11 : 10}
        weight={actionable ? 'bold' : 'medium'}
        color={actionable ? textColor : mutedColor}
      >
        {status}
      </AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});

export default RewardCard;
