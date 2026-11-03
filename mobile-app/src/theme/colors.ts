export interface ColorPalette {
  background: string;
  surface: string;
  surfaceElevated: string;
  primary: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  text: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  gold: string;
}

export const lightColors: ColorPalette = {
  background: '#F7F6F2',
  surface: '#FFFFFF',
  surfaceElevated: '#EFECE6',
  primary: '#253D2C',
  primaryLight: '#3B5E46',
  secondary: '#C86D51',
  accent: '#253D2C',
  text: '#18181B',
  textPrimary: '#18181B',
  textSecondary: '#52525B',
  textMuted: '#8E8E93',
  border: '#E4E2DD',
  success: '#2E6F40',
  warning: '#B45309',
  error: '#B91C1C',
  gold: '#C86D51',
};

export const darkColors: ColorPalette = {
  background: '#141413',
  surface: '#1E1E1C',
  surfaceElevated: '#282826',
  primary: '#4E7A5B',
  primaryLight: '#6B9B79',
  secondary: '#C86D51',
  accent: '#D4D2CC',
  text: '#F5F4F0',
  textPrimary: '#F5F4F0',
  textSecondary: '#A1A09A',
  textMuted: '#6E6D68',
  border: '#2E2E2B',
  success: '#4E7A5B',
  warning: '#D97706',
  error: '#DC2626',
  gold: '#C86D51',
};
