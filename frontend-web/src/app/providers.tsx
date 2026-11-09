'use client';

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from '@/store';
import { hydrateSession } from '@/store/slices/authSlice';
import ThemeProvider from '@/theme/ThemeProvider';
import storage, { KEYS } from '@/lib/storage';
import { captureUtmSource } from '@/lib/analytics';
import { UserProfile } from '@/types/user.types';

const SessionBootstrap: React.FC<{ store: AppStore }> = ({ store }) => {
  useEffect(() => {
    captureUtmSource(window.location.search);
    store.dispatch(
      hydrateSession({
        token: storage.get(KEYS.token),
        user: storage.getJson<UserProfile>(KEYS.user),
      })
    );
  }, [store]);
  return null;
};

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store] = useState(makeStore);
  return (
    <Provider store={store}>
      <ThemeProvider>
        <SessionBootstrap store={store} />
        {children}
      </ThemeProvider>
    </Provider>
  );
};

export default Providers;
