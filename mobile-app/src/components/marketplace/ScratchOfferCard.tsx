import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getScratchOfferName, getScratchOfferTheme } from './scratchOffers';
import useAppTheme from '../../hooks/useAppTheme';
import { ScratchOffer } from '../../types/api.types';
import AppText from '../ui/AppText';
import Icon from '../ui/icons/Icon';

export interface ScratchOfferCardProps {
  offer: ScratchOffer;
  onPress: () => void;
}

export const ScratchOfferCard: React.FC<ScratchOfferCardProps> = ({ offer, onPress }) => {
  const { colors, t } = useAppTheme();
  const theme = getScratchOfferTheme(offer, colors);
  const name = getScratchOfferName(offer, t);

  return (
    <View style={[styles.card, { backgroundColor: theme.background }]}>
      <AppText size={14} weight="bold">
        {name}
      </AppText>
      <AppText size={11} weight="medium" style={styles.subtitle}>
        {t('Une réduction en ville à révéler', 'A local discount to reveal')}
      </AppText>
      <View
        style={[styles.zone, { backgroundColor: colors.surface }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {[0, 1, 2].map((index) => (
          <View key={index} style={[styles.cell, { backgroundColor: theme.cell }]}>
            <AppText size={theme.symbolSize} weight="bold" color={theme.accent} align="center">
              {theme.symbol}
            </AppText>
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(
          `Jouer à ${name}, ${theme.cost} EtherPoints`,
          `Play ${name}, ${theme.cost} EtherPoints`,
        )}
        onPress={onPress}
        style={({ pressed }) => [
          styles.play,
          { backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <AppText size={11} weight="semibold">
          {`${theme.cost} EtherPoints`}
        </AppText>
        <Icon name="chevronRight" size={15} color={colors.ink} />
      </Pressable>
    </View>
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
    marginTop: 5,
    marginLeft: 2,
  },
  zone: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 13,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginTop: 14,
    gap: 6,
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
    justifyContent: 'space-between',
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 12,
  },
});

export default ScratchOfferCard;
