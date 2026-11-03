import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = Math.min(Math.max(SCREEN_WIDTH / 390, 0.85), 1.1);

const rf = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel(size * scale));

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: rf(12),
    sm: rf(13),
    md: rf(15),
    lg: rf(17),
    xl: rf(20),
    xxl: rf(24),
    hero: rf(30),
  },
  lineHeight: {
    xs: rf(16),
    sm: rf(18),
    md: rf(22),
    lg: rf(24),
    xl: rf(28),
    xxl: rf(32),
    hero: rf(38),
  },
} as const;
