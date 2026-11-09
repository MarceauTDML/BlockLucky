import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { runWithContext } from '../observability/request-context';
import logger from '../utils/logger.util';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

const extractTraceId = (traceparent: string | undefined): string | undefined => {
  if (!traceparent) return undefined;
  const [, traceId, , flags] = traceparent.split('-');
  return traceId && flags && /^[0-9a-f]{32}$/.test(traceId) ? traceId : undefined;
};

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.header('x-request-id');
  const requestId =
    (incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : undefined) ??
    extractTraceId(req.header('traceparent')) ??
    randomUUID();

  res.setHeader('X-Request-Id', requestId);
  res.locals.requestId = requestId;

  runWithContext({ requestId }, () => {
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      if (req.path.startsWith('/health') || req.path === '/metrics') return;
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';
      logger.log(level, `${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode}`, {
        requestId,
        method: req.method,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
      });
    });
    next();
  });
};
