'use client';

import React, { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import storage, { KEYS } from '@/lib/storage';
import { LanguageCode, ThemeMode } from '@/types/user.types';

export interface ThemeContextValue {
  mode: ThemeMode;
  language: LanguageCode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (lang: LanguageCode) => void;
  t: (frText: string, enText: string) => string;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'LIGHT',
  language: 'FR',
  toggleTheme: () => {},
  setThemeMode: () => {},
  setLanguage: () => {},
  t: (fr) => fr,
});

export const themeInitScript = `(function(){try{var t=localStorage.getItem('${KEYS.theme}');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'DARK':'LIGHT'}document.documentElement.dataset.theme=t==='DARK'?'dark':'light';var l=localStorage.getItem('${KEYS.language}');document.documentElement.lang=l==='EN'?'en':'fr';}catch(e){}})();`;

const subscribe = (onChange: () => void): (() => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'lang'],
  });
  return () => observer.disconnect();
};

const getSnapshot = (): string =>
  `${document.documentElement.dataset.theme === 'dark' ? 'DARK' : 'LIGHT'}|${
    document.documentElement.lang === 'en' ? 'EN' : 'FR'
  }`;

const getServerSnapshot = (): string => 'LIGHT|FR';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mode, language] = snapshot.split('|') as [ThemeMode, LanguageCode];

  const setThemeMode = useCallback((next: ThemeMode) => {
    storage.set(KEYS.theme, next);
    document.documentElement.dataset.theme = next === 'DARK' ? 'dark' : 'light';
  }, []);

  const toggleTheme = useCallback(() => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'DARK' : 'LIGHT';
    setThemeMode(current === 'DARK' ? 'LIGHT' : 'DARK');
  }, [setThemeMode]);

  const setLanguage = useCallback((next: LanguageCode) => {
    storage.set(KEYS.language, next);
    document.documentElement.lang = next === 'EN' ? 'en' : 'fr';
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      language,
      toggleTheme,
      setThemeMode,
      setLanguage,
      t: (frText: string, enText: string) => (language === 'FR' ? frText : enText),
    }),
    [mode, language, toggleTheme, setThemeMode, setLanguage]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = (): ThemeContextValue => useContext(ThemeContext);

export default ThemeProvider;
