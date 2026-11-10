import { z } from 'zod';

export const createPartnerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Nom de l'entreprise partenaire requis").max(100),
    logoUrl: z
      .string()
      .url('URL du logo invalide')
      .max(500)
      .refine((url) => url.startsWith('https://'), 'Le logo doit être servi en HTTPS')
      .default('https://assets.etherbay.fr/partners/default.png'),
    ownerId: z.string().uuid().optional(),
  }),
});

export const createRewardOfferSchema = z.object({
  body: z.object({
    partnerId: z.string().uuid('Identifiant partenaire invalide'),
    title: z
      .string()
      .trim()
      .min(3, "Titre de l'offre requis (ex: -15% chez la Boulangerie d'EtherBay)")
      .max(120),
    costInPoints: z.coerce.number().int().min(10, 'Coût minimum de 10 EtherPoints').max(100000),
    totalStock: z.coerce.number().int().min(1, 'Stock minimum de 1 lot').max(100000),
    expiresAt: z.string().datetime({ offset: true }).optional(),
  }),
});

export const uploadCodesBatchSchema = z.object({
  body: z.object({
    rewardId: z.string().uuid("Identifiant de l'offre requis"),
    codes: z.array(z.string().trim().min(3).max(64)).max(5000).optional(),
    csvContent: z.string().max(200000).optional(),
  }),
});
