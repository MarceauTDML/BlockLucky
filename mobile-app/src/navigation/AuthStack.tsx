import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import useAuth from '../hooks/useAuth';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import Setup2FAScreen from '../screens/auth/Setup2FAScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import Verify2FAScreen from '../screens/auth/Verify2FAScreen';
import { AuthStackParamList } from '../types/navigation.types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  const { hasSeenOnboarding } = useAuth();

  return (
    <Stack.Navigator
      initialRouteName={hasSeenOnboarding ? 'SignIn' : 'Onboarding'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Verify2FA" component={Verify2FAScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="Setup2FA" component={Setup2FAScreen} />
    </Stack.Navigator>
  );
};

export default AuthStack;
