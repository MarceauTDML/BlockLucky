import { ColorPalette } from '../../theme/colors';
import { ScratchOffer } from '../../types/api.types';

export interface ScratchOfferTheme {
  offer: ScratchOffer;
  cost: number;
  symbol: string;
  symbolSize: number;
  background: string;
  cell: string;
  accent: string;
}

export const SCRATCH_COSTS: Record<ScratchOffer, number> = {
  violet: 50,
  lucky: 100,
};

export const getScratchOfferTheme = (
  offer: ScratchOffer,
  colors: ColorPalette,
): ScratchOfferTheme =>
  offer === 'violet'
    ? {
        offer,
        cost: SCRATCH_COSTS.violet,
        symbol: '7',
        symbolSize: 22,
        background: colors.lavenderStrong,
        cell: colors.lavenderStrong,
        accent: colors.violet,
      }
    : {
        offer,
        cost: SCRATCH_COSTS.lucky,
        symbol: 'EP',
        symbolSize: 18,
        background: colors.peach,
        cell: colors.peach,
        accent: colors.terracotta,
      };

export const getScratchOfferName = (
  offer: ScratchOffer,
  t: (fr: string, en: string) => string,
): string =>
  offer === 'violet'
    ? t('Le ticket violet', 'The purple ticket')
    : t('Le porte-bonheur', 'The lucky charm');
