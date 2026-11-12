import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';

export interface TextLinkProps {
  label: string;
  emphasis?: string;
  onPress: () => void;
  align?: 'left' | 'center' | 'right';
  size?: number;
  muted?: boolean;
  underline?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const TextLink: React.FC<TextLinkProps> = ({
  label,
  emphasis,
  onPress,
  align = 'center',
  size = 12,
  muted = false,
  underline = false,
  style,
}) => {
  const { colors } = useAppTheme();
  const alignSelf = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={emphasis ? `${label} ${emphasis}` : label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.link, { alignSelf, opacity: pressed ? 0.6 : 1 }, style]}
    >
      <AppText
        size={size}
        weight={muted ? 'semibold' : 'medium'}
        color={muted ? colors.inkMuted : colors.ink}
        align={align}
        style={underline ? styles.underline : undefined}
      >
        {label}
        {emphasis ? (
          <AppText size={size} weight="bold" color={colors.ink} style={styles.underline}>
            {` ${emphasis}`}
          </AppText>
        ) : null}
      </AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  link: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  underline: {
    textDecorationLine: 'underline',
  },
});

export default TextLink;
