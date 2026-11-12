import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import NotificationButton from './NotificationButton';
import Icon from './icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import usePushNotifications from '../../hooks/usePushNotifications';
import { useRootNavigation } from '../../navigation/hooks';

export const HeaderActions: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { unreadCount } = usePushNotifications();

  return (
    <View style={styles.row}>
      <NotificationButton
        hasUnread={unreadCount > 0}
        onPress={() => navigation.navigate('Notifications')}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Paramètres', 'Settings')}
        hitSlop={6}
        onPress={() => navigation.navigate('Settings')}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Icon name="settings" size={22} color={colors.ink} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HeaderActions;
