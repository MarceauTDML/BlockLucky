import { Router } from 'express';
import prisma from '../../config/prisma.config';
import redis from '../../config/redis.config';
import { env } from '../../config/env.config';
import blockchainService from '../../services/blockchain.service';
import { isShuttingDown } from '../../observability/lifecycle';

const router = Router();

const DEEP_CHECK_CACHE_MS = 5000;
let deepCheckCache: { expiresAt: number; body: Record<string, unknown>; healthy: boolean } | null =
  null;

const checkDatabase = async (): Promise<{ status: 'up' | 'down'; latencyMs: number }> => {
  const startedAt = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ]);
    return { status: 'up', latencyMs: Date.now() - startedAt };
  } catch {
    return { status: 'down', latencyMs: Date.now() - startedAt };
  }
};

const checkRedis = async (): Promise<{ status: 'up' | 'down' | 'disabled'; latencyMs: number }> => {
  const startedAt = Date.now();
  const status = await redis.ping(1000);
  return { status, latencyMs: Date.now() - startedAt };
};

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Vérifier l'état de santé du serveur et l'indicateur de réseau Fallback
 */
router.get('/health', async (_req, res) => {
  const network = await blockchainService.getNetworkStatus();
  res.status(200).json({
    status: 'ok',
    message: 'BlockLucky API is running',
    timestamp: new Date().toISOString(),
    version: env.APP_VERSION,
    network,
  });
});

/**
 * @openapi
 * /health/live:
 *   get:
 *     tags: [System]
 *     summary: Sonde de vivacité (le process répond, aucune dépendance testée)
 */
router.get('/health/live', (_req, res) => {
  res.status(200).json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
});

/**
 * @openapi
 * /health/ready:
 *   get:
 *     tags: [System]
 *     summary: Sonde de disponibilité (PostgreSQL joignable, serveur non en cours d'arrêt)
 */
router.get('/health/ready', async (_req, res) => {
  if (isShuttingDown()) {
    res.status(503).json({ status: 'shutting_down' });
    return;
  }
  const database = await checkDatabase();
  const ready = database.status === 'up';
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', database });
});

/**
 * @openapi
 * /health/deep:
 *   get:
 *     tags: [System]
 *     summary: Diagnostic détaillé de chaque dépendance avec latence (mis en cache 5 secondes)
 */
router.get('/health/deep', async (_req, res) => {
  if (!deepCheckCache || deepCheckCache.expiresAt < Date.now()) {
    const [database, cache] = await Promise.all([checkDatabase(), checkRedis()]);
    const network = await blockchainService.getNetworkStatus();
    const healthy = database.status === 'up';
    deepCheckCache = {
      expiresAt: Date.now() + DEEP_CHECK_CACHE_MS,
      healthy,
      body: {
        status: healthy ? (cache.status === 'up' ? 'pass' : 'warn') : 'fail',
        version: env.APP_VERSION,
        checkedAt: new Date().toISOString(),
        checks: { database, redis: cache, blockchain: network },
      },
    };
  }
  res.status(deepCheckCache.healthy ? 200 : 503).json(deepCheckCache.body);
});

/**
 * @openapi
 * /api/config:
 *   get:
 *     tags: [System]
 *     summary: Configuration runtime pour les clients (version mobile minimale, mode maintenance)
 */
router.get('/api/config', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(200).json({
    success: true,
    data: {
      apiVersion: 'v1',
      minimumMobileVersion: env.MOBILE_MIN_VERSION,
      maintenance: env.MAINTENANCE_MODE,
    },
  });
});

export default router;
