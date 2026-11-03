import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation.types';
import useAuth from '../hooks/useAuth';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import Verify2FAScreen from '../screens/auth/Verify2FAScreen';
import Setup2FAScreen from '../screens/auth/Setup2FAScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  const { hasSeenOnboarding } = useAuth();

  return (
    <Stack.Navigator
      initialRouteName={hasSeenOnboarding ? 'Login' : 'Onboarding'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Verify2FA" component={Verify2FAScreen} />
      <Stack.Screen name="Setup2FA" component={Setup2FAScreen} />
    </Stack.Navigator>
  );
};

export default AuthStack;
