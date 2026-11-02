import { z } from 'zod';

export const buyTicketSchema = z.object({
  body: z.object({
    roundId: z.string().uuid().optional(),
    quantity: z.coerce.number().int().min(1).max(10).default(1),
    retryAttempt: z.coerce.number().int().min(0).default(0),
  }),
});

export const giftTicketSchema = z.object({
  body: z.object({
    recipientEmail: z.string().email('Adresse email du bénéficiaire invalide'),
    recipientWallet: z.string().optional(),
    personalMessage: z.string().max(250).optional(),
  }),
});

export const triggerDrawSchema = z.object({
  body: z.object({
    roundId: z.string().uuid().optional(),
  }),
});
