import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import { env } from '../config/env.config';

export const metricsRegistry = new client.Registry();

metricsRegistry.setDefaultLabels({ service: 'blocklucky-backend', environment: env.NODE_ENV });

if (env.METRICS_ENABLED && env.NODE_ENV !== 'test') {
  client.collectDefaultMetrics({ register: metricsRegistry, eventLoopMonitoringPrecision: 20 });
}

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP par route paramétrée',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 0.8, 1, 2.5, 5],
  registers: [metricsRegistry],
});

const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'Requêtes HTTP en cours de traitement',
  registers: [metricsRegistry],
});

export const queueJobsTotal = new client.Counter({
  name: 'queue_jobs_total',
  help: 'Jobs BullMQ traités par file et par statut',
  labelNames: ['queue', 'status'] as const,
  registers: [metricsRegistry],
});

export const businessEventsTotal = new client.Counter({
  name: 'business_events_total',
  help: 'Événements métier (tickets, points, récompenses)',
  labelNames: ['event'] as const,
  registers: [metricsRegistry],
});

const resolveRoute = (req: Request): string => {
  const routePath = req.route?.path;
  if (typeof routePath === 'string') return `${req.baseUrl}${routePath}`;
  return 'unmatched';
};

export const httpMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!env.METRICS_ENABLED) {
    next();
    return;
  }
  const stopTimer = httpRequestDuration.startTimer();
  httpRequestsInFlight.inc();
  res.on('finish', () => {
    httpRequestsInFlight.dec();
    stopTimer({ method: req.method, route: resolveRoute(req), status_code: String(res.statusCode) });
  });
  next();
};

export const metricsHandler = async (req: Request, res: Response): Promise<void> => {
  if (env.METRICS_TOKEN && req.headers.authorization !== `Bearer ${env.METRICS_TOKEN}`) {
    res.status(401).end();
    return;
  }
  res.setHeader('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
};
