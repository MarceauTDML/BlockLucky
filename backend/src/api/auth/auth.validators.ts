import { z } from 'zod';

export const socialLoginSchema = z.object({
  body: z.object({
    walletAddress: z
      .string()
      .min(10, 'Adresse de portefeuille invalide')
      .transform((val) => val.toLowerCase()),
    email: z.string().email('Adresse email invalide').optional(),
    provider: z.enum(['GOOGLE', 'APPLE', 'EMAIL', 'WALLET']).default('GOOGLE'),
    isAdultConfirmed: z.boolean().refine((val) => val === true, {
      message: 'Vous devez certifier avoir 18 ans ou plus pour participer à la loterie (Légal 18+).',
    }),
    ageGroup: z.enum(['18-25', '26-35', '36-50', '50+']).optional(),
    referralCode: z.string().optional(),
    utmSource: z.string().optional(),
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
    code: z.string().min(6, 'Le code OTP doit contenir 6 chiffres').max(10),
  }),
});

export const disable2FASchema = z.object({
  body: z.object({
    code: z.string().min(6).max(10).optional(),
  }),
});

export const logoutSchema = z.object({
  body: z
    .object({
      allDevices: z.boolean().default(false),
    })
    .default({ allDevices: false }),
});
