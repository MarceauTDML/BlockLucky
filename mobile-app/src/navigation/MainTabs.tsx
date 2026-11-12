import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '../components/ui/AppText';
import SecurityFooter from '../components/ui/SecurityFooter';
import Icon, { IconName } from '../components/ui/icons/Icon';
import useAppTheme from '../hooks/useAppTheme';
import HomeScreen from '../screens/lottery/HomeScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';
import { MainTabsParamList } from '../types/navigation.types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

const ICONS: Record<keyof MainTabsParamList, IconName> = {
  HomeTab: 'tabHome',
  TicketsTab: 'tabTickets',
  SponsorsTab: 'tabSponsors',
  ProfileTab: 'tabProfile',
};

const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom - 8, 0) },
      ]}
    >
      <View style={styles.row} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : route.name;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              style={[styles.item, { backgroundColor: focused ? colors.sunNav : 'transparent' }]}
            >
              <Icon
                name={ICONS[route.name as keyof MainTabsParamList]}
                size={22}
                color={focused ? colors.onSun : colors.inkMuted}
              />
              <AppText
                size={10}
                weight={focused ? 'bold' : 'medium'}
                color={focused ? colors.onSun : colors.inkMuted}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <SecurityFooter />
    </View>
  );
};

export const MainTabs: React.FC = () => {
  const { t } = useAppTheme();

  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: t('Accueil', 'Home') }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: t('Profil', 'Profile') }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingTop: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#1D2637',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 17,
  },
});

export default MainTabs;
