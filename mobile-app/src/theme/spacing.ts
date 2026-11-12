import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = Math.min(Math.max(SCREEN_WIDTH / 402, 0.9), 1.06);

const rs = (size: number): number => Math.round(size * scale);

export const spacing = {
  xs: rs(4),
  sm: rs(8),
  md: rs(14),
  lg: rs(20),
  xl: rs(28),
  xxl: rs(40),
  screen: rs(20),
  screenText: rs(24),
} as const;

export const borderRadius = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 28,
  full: 9999,
} as const;
