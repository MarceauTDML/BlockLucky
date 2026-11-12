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
    provider: z.enum(['GOOGLE', 'EMAIL', 'WALLET']).default('GOOGLE'),
    isAdultConfirmed: z.boolean().refine((val) => val === true, {
      message: 'Vous devez certifier avoir 18 ans ou plus pour participer à la loterie (Légal 18+).',
    }),
    acceptTerms: z
      .literal(true, {
        error: "Vous devez accepter les conditions d'utilisation et le règlement du jeu pour continuer.",
      })
      .optional(),
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
    loginTicket: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{32,128}$/, 'Ticket de connexion invalide')
      .optional(),
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

const email = z.string().trim().max(254).email('Adresse email invalide').transform((val) => val.toLowerCase());

export const passwordPolicy = z
  .string()
  .min(10, 'Le mot de passe doit contenir au moins 10 caractères')
  .max(128, 'Le mot de passe ne doit pas dépasser 128 caractères')
  .regex(/\p{L}/u, 'Le mot de passe doit contenir au moins une lettre')
  .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre');

const emailCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres');

export const signupSchema = z.object({
  body: z.object({
    email,
    password: passwordPolicy,
    acceptTerms: z.literal(true, {
      error: "Vous devez accepter les conditions d'utilisation et le règlement du jeu pour créer un compte.",
    }),
    isAdultConfirmed: z.literal(true, {
      error: 'Vous devez certifier avoir 18 ans ou plus pour créer un compte.',
    }),
    referralCode: z.string().trim().max(64).optional(),
    utmSource: z.string().trim().max(100).optional(),
    ageGroup: z.enum(['18-25', '26-35', '36-50', '50+']).optional(),
  }),
});

export const signinSchema = z.object({
  body: z.object({
    email,
    password: z.string().min(1, 'Mot de passe requis').max(128, 'Email ou mot de passe incorrect.'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email,
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email,
    code: emailCode,
    newPassword: passwordPolicy,
  }),
});

export const emailChangeRequestSchema = z.object({
  body: z.object({
    newEmail: email,
    password: z.string().min(1, 'Mot de passe requis').max(128, 'Mot de passe incorrect.').optional(),
  }),
});

export const emailChangeConfirmSchema = z.object({
  body: z.object({
    code: emailCode,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z
      .string()
      .min(1, 'Mot de passe actuel requis')
      .max(128, 'Mot de passe actuel incorrect.')
      .optional(),
    newPassword: passwordPolicy,
  }),
});

export const googleOAuthSchema = z.object({
  body: z.object({
    idToken: z.string().trim().min(20, 'Jeton Google requis').max(8192),
  }),
});
