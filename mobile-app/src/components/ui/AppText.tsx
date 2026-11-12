import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import { FontWeightName, rf } from '../../theme/typography';

type Variant =
  | 'display'
  | 'hero'
  | 'title'
  | 'section'
  | 'subtitle'
  | 'body'
  | 'small'
  | 'caption'
  | 'overline'
  | 'label';

const VARIANTS: Record<Variant, { size: number; weight: FontWeightName; uppercase?: boolean }> = {
  display: { size: 43, weight: 'bold' },
  hero: { size: 28, weight: 'bold' },
  title: { size: 23, weight: 'bold' },
  section: { size: 21, weight: 'bold' },
  subtitle: { size: 16, weight: 'bold' },
  body: { size: 13, weight: 'regular' },
  small: { size: 12, weight: 'regular' },
  caption: { size: 11, weight: 'regular' },
  overline: { size: 10, weight: 'bold', uppercase: true },
  label: { size: 9, weight: 'bold', uppercase: true },
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  size?: number;
  weight?: FontWeightName;
  italic?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

export const AppText: React.FC<AppTextProps> = ({
  children,
  variant = 'body',
  size,
  weight,
  italic = false,
  color,
  align = 'left',
  lineHeight,
  style,
  ...rest
}) => {
  const { colors, typography } = useAppTheme();
  const preset = VARIANTS[variant];
  const fontSize = rf(size ?? preset.size);
  const resolvedWeight = weight ?? preset.weight;
  const fontFamily =
    italic && resolvedWeight === 'bold'
      ? typography.fontFamily.boldItalic
      : typography.fontFamily[resolvedWeight];

  return (
    <Text
      style={[
        styles.base,
        {
          color: color ?? colors.ink,
          fontSize,
          lineHeight: lineHeight
            ? rf(lineHeight)
            : Math.round(fontSize * typography.lineHeightRatio),
          fontFamily,
          textAlign: align,
          textTransform: preset.uppercase ? 'uppercase' : 'none',
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
  },
});

export default AppText;
