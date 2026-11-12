import React from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from './AppText';
import Icon from './icons/Icon';

export interface BrandLogoProps {
  size?: 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md' }) => {
  const symbol = size === 'lg' ? 44 : 34;
  const text = size === 'lg' ? 28 : 23;

  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="BlockLucky">
      <Icon name="logoSymbol" size={symbol} />
      <AppText size={text} weight="bold">
        Block
        <AppText size={text} weight="bold" italic>
          Lucky
        </AppText>
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default BrandLogo;
