import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.config';
import redis from '../../config/redis.config';
import { hmacSha256, safeEqual } from '../../utils/crypto.util';
import { sendError, sendSuccess } from '../../utils/response.util';

export const SIGNATURE_HEADER = 'x-webhook-signature';
const TOLERANCE_SECONDS = 5 * 60;
const REPLAY_TTL_SECONDS = 7 * 24 * 3600;

export type SignatureCheck = 'valid' | 'invalid' | 'replayed';

export const signWebhookPayload = (rawBody: string, timestamp = Math.floor(Date.now() / 1000)) =>
  `t=${timestamp},v1=${hmacSha256(`${timestamp}.${rawBody}`, env.WEBHOOK_SECRET)}`;

const parseHeader = (header: string) => {
  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, rest.join('=')];
    })
  );
  return { timestamp: Number(parts.t), signature: parts.v1 ?? '' };
};

export const verifyWebhookSignature = async (req: Request): Promise<SignatureCheck> => {
  const header = req.header(SIGNATURE_HEADER);
  const rawBody = req.rawBody;
  if (!header || !rawBody) return 'invalid';

  const { timestamp, signature } = parseHeader(header);
  if (!Number.isInteger(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) return 'invalid';
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > TOLERANCE_SECONDS) return 'invalid';

  const expected = hmacSha256(`${timestamp}.${rawBody.toString('utf8')}`, env.WEBHOOK_SECRET);
  if (!safeEqual(expected, signature)) return 'invalid';

  const firstDelivery = await redis.setIfAbsent(`webhook:seen:${signature}`, '1', REPLAY_TTL_SECONDS);
  return firstDelivery ? 'valid' : 'replayed';
};

export const requireWebhookSignature = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const result = await verifyWebhookSignature(req);
  if (result === 'invalid') {
    sendError(res, 'Signature de webhook blockchain invalide ou expirée', 401);
    return;
  }
  if (result === 'replayed') {
    sendSuccess(res, { duplicate: true }, 'Événement déjà reçu, ignoré', 200);
    return;
  }
  next();
};
