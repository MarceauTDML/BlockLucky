import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import AppText from './AppText';
import Icon, { IconName } from './icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';

type ButtonVariant = 'primary' | 'dark' | 'outline' | 'soft' | 'ghost' | 'secondary' | 'danger';
type ButtonSize = 'lg' | 'md' | 'sm';

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  align?: 'center' | 'space-between';
  fullWidth?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const HEIGHTS: Record<ButtonSize, number> = { lg: 52, md: 40, sm: 32 };
const RADII: Record<ButtonSize, number> = { lg: 16, md: 12, sm: 10 };
const FONT: Record<ButtonSize, number> = { lg: 15, md: 12, sm: 11 };

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  align = 'center',
  fullWidth = true,
  accessibilityHint,
  style,
}) => {
  const { colors } = useAppTheme();
  const resolved = variant === 'secondary' ? 'dark' : variant === 'danger' ? 'outline' : variant;

  const palette = (() => {
    if (disabled)
      return { background: colors.disabled, text: colors.inkMuted, border: 'transparent' };
    switch (resolved) {
      case 'dark':
        return { background: colors.ink, text: colors.inkInverse, border: 'transparent' };
      case 'outline':
        return {
          background: colors.surface,
          text: variant === 'danger' ? colors.terracotta : colors.ink,
          border: colors.border,
        };
      case 'soft':
        return { background: colors.lavenderSoft, text: colors.violet, border: 'transparent' };
      case 'ghost':
        return { background: 'transparent', text: colors.inkMuted, border: 'transparent' };
      default:
        return { background: colors.sun, text: colors.onSun, border: 'transparent' };
    }
  })();

  const isPrimary = resolved === 'primary';
  const fontWeight = isPrimary || resolved === 'dark' ? 'bold' : 'semibold';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: HEIGHTS[size],
          borderRadius: RADII[size],
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderWidth: palette.border === 'transparent' ? 0 : 1,
          justifyContent: align === 'space-between' ? 'space-between' : 'center',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: size === 'sm' ? 12 : 16,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <>
          <View style={styles.side}>
            {leftIcon ? (
              <Icon name={leftIcon} color={palette.text} size={size === 'lg' ? 22 : 18} />
            ) : null}
            <AppText
              size={FONT[size] + (isPrimary && size === 'lg' ? 1 : 0)}
              weight={fontWeight}
              color={palette.text}
              align="center"
            >
              {title}
            </AppText>
          </View>
          {rightIcon ? (
            <Icon name={rightIcon} color={palette.text} size={size === 'lg' ? 22 : 16} />
          ) : null}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

export default AppButton;
