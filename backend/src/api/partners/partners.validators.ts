import { z } from 'zod';

export const createPartnerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Nom de l\'entreprise partenaire requis'),
    logoUrl: z.string().url('URL du logo invalide').default('https://assets.etherbay.fr/partners/default.png'),
  }),
});

export const createRewardOfferSchema = z.object({
  body: z.object({
    partnerId: z.string().uuid('Identifiant partenaire invalide'),
    title: z.string().min(3, 'Titre de l\'offre requis (ex: -15% chez la Boulangerie d\'EtherBay)'),
    costInPoints: z.coerce.number().int().min(10, 'Coût minimum de 10 EtherPoints'),
    totalStock: z.coerce.number().int().min(1, 'Stock minimum de 1 lot'),
    expiresAt: z.string().optional(),
  }),
});

export const uploadCodesBatchSchema = z.object({
  body: z.object({
    rewardId: z.string().uuid('Identifiant de l\'offre requis'),
    codes: z.array(z.string().min(3)).optional(),
    csvContent: z.string().optional(),
  }),
});
