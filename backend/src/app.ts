import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.config';
import { globalRateLimiter } from './middlewares/rateLimiter.middleware';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';
import blockchainService from './services/blockchain.service';
import { requestContextMiddleware } from './middlewares/request-context.middleware';

import authRoutes from './api/auth/auth.routes';
import lotteryRoutes from './api/lottery/lottery.routes';
import marketplaceRoutes from './api/marketplace/marketplace.routes';
import partnersRoutes from './api/partners/partners.routes';
import userRoutes from './api/user/user.routes';
import analyticsRoutes from './api/analytics/analytics.routes';
import adminRoutes from './api/admin/admin.routes';
import webhooksRoutes from './api/webhooks/webhooks.routes';

const app: Application = express();

app.use(requestContextMiddleware);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalRateLimiter);

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Vérifier l'état de santé du serveur et l'indicateur de réseau Fallback
 */
app.get('/health', async (_req, res) => {
  const network = await blockchainService.getNetworkStatus();
  res.status(200).json({
    status: 'ok',
    message: 'BlockLucky API is running',
    timestamp: new Date().toISOString(),
    network,
  });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/lottery', lotteryRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhooksRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
export default app;
