import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = Math.min(Math.max(SCREEN_WIDTH / 402, 0.9), 1.06);

export const rf = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel(size * scale));

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  boldItalic: 'Inter_700Bold_Italic',
} as const;

export type FontWeightName = 'regular' | 'medium' | 'semibold' | 'bold';

export const typography = {
  fontFamily: fontFamilies,
  lineHeightRatio: 1.3,
  fontSize: {
    xs: rf(11),
    sm: rf(12),
    md: rf(13),
    lg: rf(16),
    xl: rf(21),
    xxl: rf(23),
    hero: rf(29),
  },
  lineHeight: {
    xs: rf(14),
    sm: rf(16),
    md: rf(17),
    lg: rf(21),
    xl: rf(27),
    xxl: rf(30),
    hero: rf(38),
  },
} as const;
