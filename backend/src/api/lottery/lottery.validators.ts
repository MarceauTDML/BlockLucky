import { z } from 'zod';

export const buyTicketSchema = z.object({
  body: z.object({
    roundId: z.string().uuid().optional(),
    quantity: z.coerce.number().int().min(1).max(10).default(1),
    retryAttempt: z.coerce.number().int().min(0).max(5).default(0),
  }),
});

export const giftTicketSchema = z.object({
  body: z.object({
    recipientEmail: z.string().trim().max(254).email('Adresse email du bénéficiaire invalide'),
    recipientWallet: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/, 'Adresse de portefeuille invalide')
      .optional(),
    personalMessage: z.string().max(250).optional(),
  }),
});

export const triggerDrawSchema = z.object({
  body: z.object({
    roundId: z.string().uuid().optional(),
  }),
});
