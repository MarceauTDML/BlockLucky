import { z } from 'zod';

export const circuitBreakerSchema = z.object({
  body: z.object({
    paused: z.boolean(),
    reason: z.string().min(5, 'Motif de sécurité obligatoire pour l\'audit').optional(),
  }),
});

export const treasuryWithdrawalSchema = z.object({
  body: z.object({
    multisigWallet: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/, 'Adresse du portefeuille multi-signatures de la Mairie invalide'),
    amountEth: z.coerce
      .number()
      .positive('Le montant à retirer doit être supérieur à 0')
      .max(1000, 'Montant supérieur au plafond de retrait (1000 ETH), validation manuelle requise'),
    note: z.string().trim().max(500).optional(),
  }),
});

export const approvePartnerSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});
