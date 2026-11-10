import { z } from 'zod';

const RESERVED_PREFIXES = ['ADMIN_AUDIT', 'USER_SIGNUP', 'USER_LOGIN'];

const metadataValue = z.union([z.string().max(200), z.number(), z.boolean(), z.null()]);

export const trackEventSchema = z.object({
  body: z.object({
    eventType: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_:.-]{2,64}$/, "Type d'événement invalide")
      .refine(
        (value) => !RESERVED_PREFIXES.some((prefix) => value.toUpperCase().startsWith(prefix)),
        "Type d'événement réservé au serveur"
      ),
    utmSource: z.string().trim().max(100).optional(),
    metadata: z
      .record(z.string().max(64), metadataValue)
      .refine((value) => Object.keys(value).length <= 20, 'Métadonnées trop nombreuses')
      .optional(),
  }),
});
