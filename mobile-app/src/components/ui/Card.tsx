import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import { ColorPalette } from '../../theme/colors';

export type CardTone =
  | 'surface'
  | 'muted'
  | 'neutral'
  | 'sun'
  | 'sunSoft'
  | 'sunPale'
  | 'sunLight'
  | 'sunChip'
  | 'lavender'
  | 'lavenderStrong'
  | 'mint'
  | 'peach'
  | 'ink';

export interface CardProps {
  children: ReactNode;
  tone?: CardTone;
  radius?: number;
  padding?: number;
  elevated?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const TONES: Record<CardTone, keyof ColorPalette> = {
  surface: 'surface',
  muted: 'surfaceMuted',
  neutral: 'surfaceNeutral',
  sun: 'sun',
  sunSoft: 'sunSoft',
  sunPale: 'sunPale',
  sunLight: 'sunLight',
  sunChip: 'sunChip',
  lavender: 'lavender',
  lavenderStrong: 'lavenderStrong',
  mint: 'mint',
  peach: 'peach',
  ink: 'ink',
};

export const Card: React.FC<CardProps> = ({
  children,
  tone = 'surface',
  radius = 24,
  padding = 18,
  elevated = false,
  onPress,
  accessibilityLabel,
  style,
}) => {
  const { colors } = useAppTheme();
  const background = tone === 'ink' ? colors.onSun : colors[TONES[tone]];
  const shadow = elevated
    ? {
        shadowColor: '#AC8D0A',
        shadowOpacity: 0.12,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      }
    : null;
  const cardStyle = [
    styles.card,
    { backgroundColor: background, borderRadius: radius, padding },
    shadow,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.9 : 1 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});

export default Card;
