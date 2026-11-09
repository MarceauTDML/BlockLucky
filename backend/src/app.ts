import express, { Application, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.config';
import { corsOrigins, env, trustProxy } from './config/env.config';
import { globalRateLimiter } from './middlewares/rateLimiter.middleware';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';
import { requestContextMiddleware } from './middlewares/request-context.middleware';
import { httpMetricsMiddleware, metricsHandler } from './observability/metrics';
import { sendError } from './utils/response.util';

import systemRoutes from './api/system/system.routes';
import authRoutes from './api/auth/auth.routes';
import lotteryRoutes from './api/lottery/lottery.routes';
import marketplaceRoutes from './api/marketplace/marketplace.routes';
import partnersRoutes from './api/partners/partners.routes';
import userRoutes from './api/user/user.routes';
import analyticsRoutes from './api/analytics/analytics.routes';
import adminRoutes from './api/admin/admin.routes';
import webhooksRoutes from './api/webhooks/webhooks.routes';

const app: Application = express();

app.set('trust proxy', trustProxy);

app.use(requestContextMiddleware);
app.use(httpMetricsMiddleware);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || corsOrigins.includes(origin));
    },
    credentials: true,
    exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(systemRoutes);
app.get('/metrics', metricsHandler);

app.use((req, res, next) => {
  if (env.MAINTENANCE_MODE && req.path.startsWith('/api/') && !req.path.startsWith('/api/admin')) {
    res.setHeader('Retry-After', '300');
    sendError(res, 'Service en maintenance, veuillez réessayer plus tard', 503);
    return;
  }
  next();
});

app.use(globalRateLimiter);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const apiRouter = Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/lottery', lotteryRoutes);
apiRouter.use('/marketplace', marketplaceRoutes);
apiRouter.use('/partners', partnersRoutes);
apiRouter.use('/user', userRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/webhooks', webhooksRoutes);

app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
export default app;
