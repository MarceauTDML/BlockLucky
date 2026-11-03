import React, { useEffect } from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from './store';
import { ThemeProvider } from './theme/ThemeProvider';
import useAppTheme from './hooks/useAppTheme';
import RootNavigator from './navigation/RootNavigator';
import sentryClient from './services/sentry.client';

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
  useEffect(() => {
    sentryClient.init();
  }, []);

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
