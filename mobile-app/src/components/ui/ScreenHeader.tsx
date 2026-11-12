import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from './AppText';
import BackButton from './BackButton';
import useAppTheme from '../../hooks/useAppTheme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, onBack, right }) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      {onBack ? <BackButton onPress={onBack} /> : null}
      <View style={styles.titles}>
        <AppText variant="title" accessibilityRole="header" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText size={11} weight="medium" color={colors.inkMuted}>
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
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
});

export default ScreenHeader;
