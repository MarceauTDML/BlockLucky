import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import Icon from './icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';

export interface BackButtonProps {
  onPress: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export const BackButton: React.FC<BackButtonProps> = ({ onPress, label, style }) => {
  const { colors, t } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label || t('Retour', 'Back')}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Icon name="arrowLeft" size={24} color={colors.ink} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BackButton;
