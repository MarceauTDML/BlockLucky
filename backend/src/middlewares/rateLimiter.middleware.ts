import rateLimit, { Options, ipKeyGenerator } from 'express-rate-limit';
import { RedisStore, RedisReply } from 'rate-limit-redis';
import { env } from '../config/env.config';
import redis from '../config/redis.config';

const buildStore = (prefix: string): Options['store'] | undefined => {
  const client = redis.getRawClient();
  if (!client) return undefined;
  return new RedisStore({
    prefix: `${env.REDIS_KEY_PREFIX}:${env.NODE_ENV}:ratelimit:${prefix}:`,
    sendCommand: (command: string, ...args: string[]) =>
      client.call(command, ...args) as Promise<RedisReply>,
  });
};

const withStore = (prefix: string): Partial<Options> => {
  const store = buildStore(prefix);
  return store ? { store } : {};
};

const commonOptions: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
};

export const globalRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 10000 : 300,
  ...withStore('global'),
  message: {
    success: false,
    message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.',
  },
});

export const authRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 10 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 10000 : 30,
  ...withStore('auth'),
  message: {
    success: false,
    message: 'Trop de tentatives de connexion/2FA, veuillez patienter quelques minutes.',
  },
});

export const identityUploadRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 10000 : 10,
  ...withStore('identity'),
  message: {
    success: false,
    message: "Trop d'envois de pièce d'identité, veuillez réessayer dans une heure.",
  },
});

export const supportRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 10000 : 5,
  ...withStore('support'),
  keyGenerator: (req) => (req.user?.userId ? `user:${req.user.userId}` : `ip:${ipKeyGenerator(req.ip ?? '')}`),
  message: {
    success: false,
    message: 'Trop de messages envoyés au support, veuillez réessayer dans une heure.',
  },
});
