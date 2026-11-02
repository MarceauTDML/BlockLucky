import { z } from 'zod';

export const trackEventSchema = z.object({
  body: z.object({
    eventType: z.string().min(2, "Type d'événement requis"),
    utmSource: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});
