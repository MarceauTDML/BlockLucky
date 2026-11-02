import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { globalRateLimiter } from './middlewares/rateLimiter.middleware';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';

const app: Application = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalRateLimiter);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'BlockLucky API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
export default app;