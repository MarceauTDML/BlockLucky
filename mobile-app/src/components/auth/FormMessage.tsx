import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import Icon from '../ui/icons/Icon';

export interface FormMessageProps {
  message: string;
  tone?: 'error' | 'info' | 'success';
  style?: StyleProp<ViewStyle>;
}

export const FormMessage: React.FC<FormMessageProps> = ({ message, tone = 'error', style }) => {
  const { colors } = useAppTheme();
  const palette =
    tone === 'error'
      ? { background: colors.peach, color: colors.terracotta, icon: 'alert' as const }
      : tone === 'success'
        ? { background: colors.mint, color: colors.green, icon: 'check' as const }
        : { background: colors.lavender, color: colors.violet, icon: 'alert' as const };

  return (
    <View
      style={[styles.box, { backgroundColor: palette.background }, style]}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <Icon name={palette.icon} size={18} color={palette.color} />
      <AppText size={12} weight="medium" color={palette.color} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  text: {
    flex: 1,
  },
});

export default FormMessage;
