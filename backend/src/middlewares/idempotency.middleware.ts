import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis.config';
import { sendError } from '../utils/response.util';

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const RESULT_TTL_SECONDS = 24 * 3600;
const LOCK_TTL_SECONDS = 60;
const PENDING = '__pending__';

interface StoredResponse {
  statusCode: number;
  body: unknown;
}

export const idempotency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const idempotencyKey = req.header('idempotency-key');
  if (!idempotencyKey) {
    next();
    return;
  }
  if (!KEY_PATTERN.test(idempotencyKey)) {
    sendError(res, 'En-tête Idempotency-Key invalide', 400);
    return;
  }

  const owner = req.user?.userId ?? 'anonymous';
  const storageKey = `idempotency:${owner}:${req.method}:${req.baseUrl}${req.path}:${idempotencyKey}`;

  const acquired = await redis.setIfAbsent(storageKey, PENDING, LOCK_TTL_SECONDS);
  if (!acquired) {
    const stored = await redis.get(storageKey);
    if (!stored || stored === PENDING) {
      res.setHeader('Retry-After', '1');
      sendError(res, 'Une requête identique est déjà en cours de traitement', 409);
      return;
    }
    const replay = JSON.parse(stored) as StoredResponse;
    res.setHeader('Idempotent-Replayed', 'true');
    res.status(replay.statusCode).json(replay.body);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode < 500) {
      void redis.set(
        storageKey,
        JSON.stringify({ statusCode: res.statusCode, body } satisfies StoredResponse),
        RESULT_TTL_SECONDS
      );
    } else {
      void redis.del(storageKey);
    }
    return originalJson(body);
  };

  next();
};

export default idempotency;
