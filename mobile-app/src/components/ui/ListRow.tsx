import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from './AppText';
import Icon, { IconName } from './icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTone?: 'sun' | 'lavender' | 'mint' | 'peach' | 'muted';
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  divider?: boolean;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  icon,
  iconTone = 'muted',
  value,
  right,
  onPress,
  destructive = false,
  divider = false,
}) => {
  const { colors } = useAppTheme();
  const tones = {
    sun: { background: colors.sunSoft, color: colors.onSun },
    lavender: { background: colors.lavender, color: colors.violet },
    mint: { background: colors.mint, color: colors.green },
    peach: { background: colors.peach, color: colors.terracotta },
    muted: { background: colors.surfaceMuted, color: colors.ink },
  };
  const tone = destructive ? tones.peach : tones[iconTone];

  const content = (
    <View
      style={[
        styles.row,
        divider ? { borderBottomWidth: 1, borderBottomColor: colors.divider } : null,
      ]}
    >
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: tone.background }]}>
          <Icon name={icon} size={20} color={tone.color} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText size={14} weight="semibold" color={destructive ? colors.terracotta : colors.ink}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText size={11} color={colors.inkMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText size={12} weight="medium" color={colors.inkMuted}>
          {value}
        </AppText>
      ) : null}
      {right}
      {onPress && !right ? <Icon name="chevronRight" size={18} color={colors.inkMuted} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
});

export default ListRow;
