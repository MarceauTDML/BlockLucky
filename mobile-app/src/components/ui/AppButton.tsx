import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from './AppText';

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) => {
  const { colors, borderRadius, isCompactScreen } = useAppTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.surfaceElevated;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'danger':
        return colors.error;
      case 'outline':
        return 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    if (variant === 'outline') return colors.textPrimary;
    return '#F7F6F2';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderRadius: borderRadius.md,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: variant === 'outline' ? colors.border : 'transparent',
          minHeight: isCompactScreen ? 44 : 48,
          paddingVertical: isCompactScreen ? 10 : 13,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <AppText variant="body" weight="medium" color={getTextColor()} align="center">
          {title}
        </AppText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppButton;
