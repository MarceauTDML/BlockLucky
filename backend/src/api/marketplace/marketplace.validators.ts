import { z } from 'zod';

export const claimRewardSchema = z.object({
  body: z.object({
    rewardId: z.string().uuid('Identifiant de récompense invalide'),
  }),
});

export const usePromoCodeSchema = z.object({
  body: z.object({
    uniqueCode: z.string().min(4, 'Code promo requis'),
  }),
});
