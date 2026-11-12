import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import AppText from './AppText';
import useAppTheme from '../../hooks/useAppTheme';

export type PillTone =
  'ink' | 'sun' | 'sunSoft' | 'lavender' | 'mint' | 'peach' | 'muted' | 'surface';

export interface PillProps {
  label: string;
  tone?: PillTone;
  dot?: boolean;
  uppercase?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Pill: React.FC<PillProps> = ({
  label,
  tone = 'ink',
  dot = false,
  uppercase = true,
  style,
}) => {
  const { colors } = useAppTheme();
  const palette: Record<PillTone, { background: string; text: string }> = {
    ink: { background: colors.onSun, text: colors.onInk },
    sun: { background: colors.sun, text: colors.onSun },
    sunSoft: { background: colors.sunSoft, text: colors.onSun },
    lavender: { background: colors.lavender, text: colors.violet },
    mint: { background: colors.mint, text: colors.green },
    peach: { background: colors.peach, text: colors.terracotta },
    muted: { background: colors.surfaceMuted, text: colors.inkMuted },
    surface: { background: colors.surface, text: colors.ink },
  };
  const { background, text } = palette[tone];

  return (
    <View style={[styles.pill, { backgroundColor: background }, style]}>
      {dot ? (
        <View style={[styles.dot, { backgroundColor: tone === 'ink' ? colors.onInk : text }]} />
      ) : null}
      <AppText
        size={uppercase ? 9 : 11}
        weight={uppercase ? 'bold' : 'semibold'}
        color={text}
        style={uppercase ? styles.upper : undefined}
      >
        {label}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  upper: {
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
});

export default Pill;
