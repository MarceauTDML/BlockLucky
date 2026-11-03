import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';

export interface AppTextProps extends TextProps {
  variant?: 'hero' | 'title' | 'subtitle' | 'body' | 'caption' | 'overline';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export const AppText: React.FC<AppTextProps> = ({
  children,
  variant = 'body',
  weight = 'regular',
  color,
  align = 'left',
  style,
  ...rest
}) => {
  const { colors, typography } = useAppTheme();

  const fontSizeMap = {
    hero: typography.fontSize.hero,
    title: typography.fontSize.xxl,
    subtitle: typography.fontSize.lg,
    body: typography.fontSize.md,
    caption: typography.fontSize.xs,
    overline: typography.fontSize.xs,
  };

  const lineHeightMap = {
    hero: typography.lineHeight.hero,
    title: typography.lineHeight.xxl,
    subtitle: typography.lineHeight.lg,
    body: typography.lineHeight.md,
    caption: typography.lineHeight.xs,
    overline: typography.lineHeight.xs,
  };

  const fontWeightMap = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  };

  return (
    <Text
      style={[
        styles.base,
        variant === 'overline' ? styles.overline : undefined,
        {
          color: color || colors.textPrimary,
          fontSize: fontSizeMap[variant],
          lineHeight: lineHeightMap[variant],
          fontWeight: fontWeightMap[weight],
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
    letterSpacing: -0.15,
  },
  overline: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});

export default AppText;
