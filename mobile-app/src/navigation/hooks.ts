import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  AuthStackParamList,
  MainTabsParamList,
  RootStackParamList,
} from '../types/navigation.types';

export type RootNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<MainTabsParamList>
>;

export type AuthNavigation = NativeStackNavigationProp<AuthStackParamList>;

export const useRootNavigation = (): RootNavigation => useNavigation<RootNavigation>();

export const useAuthNavigation = (): AuthNavigation => useNavigation<AuthNavigation>();
