import React from 'react';
import { StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import HeaderActions from '../ui/HeaderActions';

export interface TabTitleProps {
  title: string;
  subtitle?: string;
}

export const TabTitle: React.FC<TabTitleProps> = ({ title, subtitle }) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        <AppText size={30} weight="bold" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText size={13} color={colors.inkMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <HeaderActions />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
    marginBottom: 22,
  },
  titles: {
    flex: 1,
    gap: 4,
  },
});

export default TabTitle;
