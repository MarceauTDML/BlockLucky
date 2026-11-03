import React, { createContext, useState, useMemo, ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { ColorPalette, darkColors, lightColors } from './colors';
import { spacing, borderRadius } from './spacing';
import { typography } from './typography';
import { ThemeMode, LanguageCode } from '../types/user.types';

export interface ThemeContextValue {
  mode: ThemeMode;
  language: LanguageCode;
  colors: ColorPalette;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  screenWidth: number;
  screenHeight: number;
  isCompactScreen: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (lang: LanguageCode) => void;
  t: (frText: string, enText: string) => string;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'LIGHT',
  language: 'FR',
  colors: lightColors,
  spacing,
  borderRadius,
  typography,
  screenWidth: 390,
  screenHeight: 844,
  isCompactScreen: false,
  toggleTheme: () => {},
  setThemeMode: () => {},
  setLanguage: () => {},
  t: (frText) => frText,
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('LIGHT');
  const [language, setLang] = useState<LanguageCode>('FR');
  const { width, height } = useWindowDimensions();

  const toggleTheme = () => {
    setMode((prev) => (prev === 'LIGHT' ? 'DARK' : 'LIGHT'));
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      language,
      colors: mode === 'DARK' ? darkColors : lightColors,
      spacing,
      borderRadius,
      typography,
      screenWidth: width,
      screenHeight: height,
      isCompactScreen: width < 360 || height < 700,
      toggleTheme,
      setThemeMode: setMode,
      setLanguage: setLang,
      t: (frText: string, enText: string) => (language === 'FR' ? frText : enText),
    }),
    [mode, language, width, height]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
