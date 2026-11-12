import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Icon from './icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';

export interface NotificationButtonProps {
  onPress: () => void;
  hasUnread?: boolean;
}

export const NotificationButton: React.FC<NotificationButtonProps> = ({
  onPress,
  hasUnread = false,
}) => {
  const { colors, t } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        hasUnread
          ? t('Notifications, nouvelles alertes', 'Notifications, new alerts')
          : t('Notifications', 'Notifications')
      }
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Icon name="bell" size={24} color={colors.ink} />
      {hasUnread ? (
        <View
          style={[styles.dot, { backgroundColor: colors.coral, borderColor: colors.surface }]}
        />
      ) : null}
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
  dot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});

export default NotificationButton;
