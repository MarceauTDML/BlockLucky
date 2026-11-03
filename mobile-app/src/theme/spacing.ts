import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = Math.min(Math.max(SCREEN_WIDTH / 390, 0.85), 1.12);

const rs = (size: number): number => Math.round(size * scale);

export const spacing = {
  xs: rs(4),
  sm: rs(8),
  md: rs(14),
  lg: rs(20),
  xl: rs(28),
  xxl: rs(40),
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
} as const;
