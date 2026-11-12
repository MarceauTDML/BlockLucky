import { z } from 'zod';

export const claimRewardSchema = z.object({
  body: z.object({
    rewardId: z.string().uuid('Identifiant de récompense invalide'),
  }),
});

export const scratchTicketSchema = z.object({
  body: z.object({
    offer: z.enum(['violet', 'lucky'], { error: "Offre de ticket à gratter inconnue (violet ou lucky)" }),
  }),
});

export const usePromoCodeSchema = z.object({
  body: z.object({
    uniqueCode: z.string().trim().min(4, 'Code promo requis').max(64),
  }),
});
