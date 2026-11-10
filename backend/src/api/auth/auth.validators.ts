import { z } from 'zod';

const otpCode = z
  .string()
  .trim()
  .min(6, 'Le code doit contenir au moins 6 caractères')
  .max(16)
  .regex(/^[0-9A-Za-z-]+$/, 'Format de code invalide');

export const socialLoginSchema = z.object({
  body: z.object({
    walletAddress: z
      .string()
      .trim()
      .regex(/^0x[0-9a-fA-F]{40}$/, 'Adresse de portefeuille invalide')
      .transform((val) => val.toLowerCase()),
    email: z.string().trim().max(254).email('Adresse email invalide').optional(),
    provider: z.enum(['GOOGLE', 'APPLE', 'EMAIL', 'WALLET']).default('GOOGLE'),
    isAdultConfirmed: z.boolean().refine((val) => val === true, {
      message: 'Vous devez certifier avoir 18 ans ou plus pour participer à la loterie (Légal 18+).',
    }),
    ageGroup: z.enum(['18-25', '26-35', '36-50', '50+']).optional(),
    referralCode: z.string().trim().max(64).optional(),
    utmSource: z.string().trim().max(100).optional(),
  }),
});

export const setup2FASchema = z.object({
  body: z.object({
    method: z.enum(['APP', 'EMAIL']),
  }),
});

export const verify2FASchema = z.object({
  body: z.object({
    userId: z.string().uuid().optional(),
    code: otpCode,
  }),
});

export const disable2FASchema = z.object({
  body: z.object({
    code: otpCode.optional(),
  }),
});

export const logoutSchema = z.object({
  body: z
    .object({
      allDevices: z.boolean().default(false),
    })
    .default({ allDevices: false }),
});
