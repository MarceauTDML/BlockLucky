import React from 'react';
import { StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import usePushNotifications from '../../hooks/usePushNotifications';
import { useRootNavigation } from '../../navigation/hooks';
import AppText from '../ui/AppText';
import NotificationButton from '../ui/NotificationButton';

export interface TabTitleProps {
  title: string;
  subtitle?: string;
}

export const TabTitle: React.FC<TabTitleProps> = ({ title, subtitle }) => {
  const { colors } = useAppTheme();
  const navigation = useRootNavigation();
  const { unreadCount } = usePushNotifications();

  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        <AppText size={30} weight="bold" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText size={13} color={colors.inkMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <NotificationButton
        hasUnread={unreadCount > 0}
        onPress={() => navigation.navigate('Notifications')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
    marginBottom: 22,
  },
  titles: {
    flex: 1,
    gap: 4,
  },
});

export default TabTitle;
