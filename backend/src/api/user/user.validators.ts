import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  body: z.object({
    theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
    language: z.enum(['FR', 'EN']).optional(),
    pushNotificationsEnabled: z.boolean().optional(),
  }),
});

export const setResponsibleGamingLimitSchema = z.object({
  body: z.object({
    maxTicketsPerRound: z.coerce
      .number()
      .int()
      .min(1, 'La limite doit être d\'au moins 1 ticket')
      .max(500, 'La limite maximale autorisée est de 500 tickets'),
  }),
});

export const completeSocialQuestSchema = z.object({
  body: z.object({
    questId: z.enum([
      'FOLLOW_TWITTER_ETHERBAY',
      'JOIN_DISCORD_ETHERBAY',
      'SHARE_LOTTERY_LINK',
      'READ_TRANSPARENCY_CHARTER',
    ]),
  }),
});

export const confirmGdprDeletionSchema = z.object({
  body: z.object({
    token: z.string().min(10, 'Jeton de confirmation RGPD requis').max(128),
  }),
});
