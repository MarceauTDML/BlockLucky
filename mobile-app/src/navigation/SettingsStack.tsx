import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../types/navigation.types';
import ProfileScreen from '../screens/settings/ProfileScreen';
import SecurityScreen from '../screens/settings/SecurityScreen';
import Setup2FAScreen from '../screens/auth/Setup2FAScreen';
import GDPRScreen from '../screens/settings/GDPRScreen';
import HelpSupportScreen from '../screens/settings/HelpSupportScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="Setup2FA" component={Setup2FAScreen} />
      <Stack.Screen name="GDPR" component={GDPRScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
    </Stack.Navigator>
  );
};

export default SettingsStack;
