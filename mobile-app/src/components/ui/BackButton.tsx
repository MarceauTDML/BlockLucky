import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from './AppText';

export interface BackButtonProps {
  onPress: () => void;
  label?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  label,
}) => {
  const { colors, borderRadius, t } = useAppTheme();
  const displayLabel = label || t('Retour', 'Back');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          backgroundColor: colors.surfaceElevated,
          borderRadius: borderRadius.sm,
        },
      ]}
    >
      <AppText variant="caption" weight="medium" color={colors.textPrimary}>
        {'← '}
        {displayLabel}
      </AppText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },
});

export default BackButton;
