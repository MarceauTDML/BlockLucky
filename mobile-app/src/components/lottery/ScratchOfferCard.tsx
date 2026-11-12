import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatInteger } from './lotteryFormat';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import Icon from '../ui/icons/Icon';

export interface ScratchOfferCardProps {
  variant: 'violet' | 'lucky';
  title: string;
  subtitle: string;
  costPoints: number;
  affordable: boolean;
  onPress: () => void;
}

export const ScratchOfferCard: React.FC<ScratchOfferCardProps> = ({
  variant,
  title,
  subtitle,
  costPoints,
  affordable,
  onPress,
}) => {
  const { colors, t } = useAppTheme();
  const background = variant === 'violet' ? colors.lavenderStrong : colors.peach;
  const accent = variant === 'violet' ? colors.violet : colors.terracotta;
  const symbol = variant === 'violet' ? '7' : 'EP';
  const costLabel = `${formatInteger(costPoints)} EtherPoints`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${costLabel}`}
      accessibilityHint={
        affordable
          ? t('Ouvre le ticket à gratter', 'Opens the scratch card')
          : t('Solde d’EtherPoints insuffisant', 'Not enough EtherPoints')
      }
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: background, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <AppText size={14} weight="bold" numberOfLines={1}>
        {title}
      </AppText>
      <AppText size={11} weight="medium" numberOfLines={2} style={styles.subtitle}>
        {subtitle}
      </AppText>
      <View style={[styles.zone, { backgroundColor: colors.surface }]}>
        {[0, 1, 2].map((index) => (
          <View key={index} style={[styles.cell, { backgroundColor: background }]}>
            <AppText size={symbol.length > 1 ? 18 : 22} weight="bold" color={accent} align="center">
              {symbol}
            </AppText>
          </View>
        ))}
      </View>
      <View style={[styles.play, { backgroundColor: colors.surface }]}>
        <AppText
          size={11}
          weight="semibold"
          color={affordable ? colors.ink : colors.inkMuted}
          style={styles.flex}
          numberOfLines={1}
        >
          {costLabel}
        </AppText>
        <Icon name="chevronSmall" size={15} color={colors.ink} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 23,
    padding: 12,
    paddingTop: 14,
  },
  subtitle: {
    marginTop: 4,
    minHeight: 28,
  },
  zone: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: 13,
    padding: 7,
    marginTop: 4,
  },
  cell: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    minHeight: 37,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  flex: {
    flex: 1,
  },
});

export default ScratchOfferCard;
