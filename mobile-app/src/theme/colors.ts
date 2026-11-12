export interface ColorPalette {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceNeutral: string;
  ink: string;
  inkMuted: string;
  inkInverse: string;
  onSun: string;
  onInk: string;
  onSunMuted: string;
  border: string;
  divider: string;
  separator: string;
  disabled: string;
  sun: string;
  sunSoft: string;
  sunPale: string;
  sunLight: string;
  sunChip: string;
  sunTrack: string;
  sunNav: string;
  lavender: string;
  lavenderStrong: string;
  lavenderSoft: string;
  violet: string;
  mint: string;
  green: string;
  peach: string;
  terracotta: string;
  coral: string;
  overlay: string;
  shadowSun: string;
  shadowModal: string;
  surfaceElevated: string;
  primary: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  text: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  error: string;
  gold: string;
}

const sunFamily = {
  sun: '#FFDA38',
  sunSoft: '#FFF4B8',
  sunPale: '#FFF6CA',
  sunLight: '#FFE979',
  sunChip: '#FFF7D3',
  sunTrack: '#E4C64B',
  onSun: '#1D2637',
  onInk: '#FFFFFF',
  onSunMuted: '#4A5263',
  shadowSun: 'rgba(172, 141, 10, 0.12)',
};

export const lightColors: ColorPalette = {
  ...sunFamily,
  background: '#F6F7FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F6F9',
  surfaceNeutral: '#F0F2F6',
  ink: '#1D2637',
  inkMuted: '#657084',
  inkInverse: '#FFFFFF',
  border: '#E2E5EB',
  divider: '#E8EBEF',
  separator: '#DFE3EB',
  disabled: '#E3E7ED',
  sunNav: '#FFF3B5',
  lavender: '#EEE9FF',
  lavenderStrong: '#E8E2FF',
  lavenderSoft: '#F2EEFC',
  violet: '#7357B1',
  mint: '#E6EFEA',
  green: '#356C58',
  peach: '#FFE5D8',
  terracotta: '#A95837',
  coral: '#E87F69',
  overlay: 'rgba(15, 23, 38, 0.5)',
  shadowModal: 'rgba(17, 24, 39, 0.18)',
  surfaceElevated: '#F5F6F9',
  primary: '#1D2637',
  primaryLight: '#657084',
  secondary: '#A95837',
  accent: '#FFDA38',
  text: '#1D2637',
  textPrimary: '#1D2637',
  textSecondary: '#657084',
  textMuted: '#657084',
  success: '#356C58',
  warning: '#A95837',
  error: '#A95837',
  gold: '#FFDA38',
};

export const darkColors: ColorPalette = {
  ...sunFamily,
  background: '#0F1626',
  surface: '#1A2333',
  surfaceMuted: '#222C3E',
  surfaceNeutral: '#283246',
  ink: '#F3F5F9',
  inkMuted: '#A3ACBD',
  inkInverse: '#1D2637',
  border: '#2C3649',
  divider: '#2C3649',
  separator: '#2C3649',
  disabled: '#2C3649',
  sunNav: '#3A3420',
  lavender: '#2A2546',
  lavenderStrong: '#312A55',
  lavenderSoft: '#2A2546',
  violet: '#B9A6F0',
  mint: '#1E3329',
  green: '#7FC4A6',
  peach: '#3D2A22',
  terracotta: '#F0A07F',
  coral: '#E87F69',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadowModal: 'rgba(0, 0, 0, 0.45)',
  surfaceElevated: '#222C3E',
  primary: '#F3F5F9',
  primaryLight: '#A3ACBD',
  secondary: '#F0A07F',
  accent: '#FFDA38',
  text: '#F3F5F9',
  textPrimary: '#F3F5F9',
  textSecondary: '#A3ACBD',
  textMuted: '#A3ACBD',
  success: '#7FC4A6',
  warning: '#F0A07F',
  error: '#F0A07F',
  gold: '#FFDA38',
};
