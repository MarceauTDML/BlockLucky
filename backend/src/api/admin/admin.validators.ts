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

export const listIdentityVerificationsSchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).default('PENDING'),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const identityVerificationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Identifiant de demande invalide'),
  }),
});

export const identityDecisionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Identifiant de demande invalide'),
  }),
  body: z
    .object({
      approved: z.boolean({ error: 'La décision (approved) est obligatoire' }),
      note: z.string().trim().max(500, 'Le motif ne doit pas dépasser 500 caractères').optional(),
    })
    .refine((value) => value.approved || Boolean(value.note && value.note.length >= 3), {
      message: 'Le motif du refus est obligatoire',
      path: ['note'],
    }),
});

export const listStaffAccountsSchema = z.object({
  query: z.object({
    role: z.enum(['ADMIN', 'PARTNER']).optional(),
    search: z.string().trim().max(120, 'Recherche trop longue').optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

const optionalName = z
  .string()
  .trim()
  .max(80, 'Le nom ne doit pas dépasser 80 caractères')
  .optional()
  .transform((value) => (value ? value : undefined));

export const createStaffAccountSchema = z.object({
  body: z
    .object({
      email: z.string().trim().toLowerCase().email('Adresse email invalide'),
      role: z.enum(['PARTNER', 'ADMIN'], { error: 'Le rôle doit être PARTNER ou ADMIN' }),
      firstName: optionalName,
      lastName: optionalName,
      partnerId: z.string().uuid('Identifiant d\'établissement invalide').optional(),
    })
    .refine((value) => value.role === 'PARTNER' || !value.partnerId, {
      message: 'Un établissement ne peut être rattaché qu\'à un compte partenaire',
      path: ['partnerId'],
    }),
});

export const updateStaffRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Identifiant de compte invalide'),
  }),
  body: z.object({
    role: z.enum(['USER', 'PARTNER', 'ADMIN'], { error: 'Le rôle doit être USER, PARTNER ou ADMIN' }),
  }),
});
