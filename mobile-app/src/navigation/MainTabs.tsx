import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabsParamList } from '../types/navigation.types';
import useAppTheme from '../hooks/useAppTheme';
import AppText from '../components/ui/AppText';
import HomeScreen from '../screens/lottery/HomeScreen';
import BuyTicketScreen from '../screens/lottery/BuyTicketScreen';
import LiveDrawScreen from '../screens/lottery/LiveDrawScreen';
import RewardsCatalogScreen from '../screens/marketplace/RewardsCatalogScreen';
import SettingsStack from './SettingsStack';

const Tab = createBottomTabNavigator<MainTabsParamList>();

const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { colors, borderRadius } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title || route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.75}
            onPress={onPress}
            style={[
              styles.tabItem,
              {
                backgroundColor: isFocused
                  ? colors.surfaceElevated
                  : 'transparent',
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <View
              style={[
                styles.indicatorDot,
                {
                  backgroundColor: isFocused ? colors.primary : 'transparent',
                },
              ]}
            />
            <AppText
              variant="caption"
              weight={isFocused ? 'semibold' : 'regular'}
              color={isFocused ? colors.primary : colors.textMuted}
              align="center"
            >
              {label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export const MainTabs: React.FC = () => {
  const { t } = useAppTheme();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: t('Accueil', 'Home') }}
      />
      <Tab.Screen
        name="BuyTicketTab"
        component={BuyTicketScreen}
        options={{ tabBarLabel: t('Tickets', 'Tickets') }}
      />
      <Tab.Screen
        name="LiveDrawTab"
        component={LiveDrawScreen}
        options={{ tabBarLabel: t('Tirage', 'Live Draw') }}
      />
      <Tab.Screen
        name="MarketplaceTab"
        component={RewardsCatalogScreen}
        options={{ tabBarLabel: t('Boutique', 'Shop') }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{ tabBarLabel: t('Profil', 'Profile') }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 10,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  indicatorDot: {
    width: 14,
    height: 2,
    borderRadius: 1,
  },
});

export default MainTabs;
