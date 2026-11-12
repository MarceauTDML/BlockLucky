import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import AppText from './AppText';
import useAppTheme from '../../hooks/useAppTheme';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, right, style }) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.row, style]}>
      <View style={styles.titles}>
        <AppText variant="section" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText size={11} color={colors.inkMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 30,
    marginBottom: 14,
  },
  titles: {
    flex: 1,
    gap: 3,
  },
});

export default SectionHeader;
