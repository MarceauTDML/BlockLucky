import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.config';
import { globalRateLimiter } from './middlewares/rateLimiter.middleware';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';
import blockchainService from './services/blockchain.service';
import authRoutes from './api/auth/auth.routes';

const app: Application = express();

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
 *     summary: VÃ©rifier l'Ã©tat de santÃ© du serveur et l'indicateur de rÃ©seau Fallback
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

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
export default app;