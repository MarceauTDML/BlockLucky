import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_700Bold_Italic,
} from '@expo-google-fonts/inter';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';

import useAppTheme from './hooks/useAppTheme';
import RootNavigator from './navigation/RootNavigator';
import sentryClient from './services/sentry.client';
import { store } from './store';
import { ThemeProvider } from './theme/ThemeProvider';

const AppShell: React.FC = () => {
  const { mode } = useAppTheme();

  return (
    <>
      <StatusBar style={mode === 'DARK' ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_700Bold_Italic,
  });

  useEffect(() => {
    sentryClient.init();
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#F6F7FA' }} />;
  }

  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </SafeAreaProvider>
    </ReduxProvider>
  );
}

registerRootComponent(App);
