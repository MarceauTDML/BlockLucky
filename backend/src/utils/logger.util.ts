import winston from 'winston';
import { env } from '../config/env.config';
import { getRequestContext } from '../observability/request-context';

const withRequestContext = winston.format((info) => {
  const context = getRequestContext();
  if (context) {
    info.requestId = context.requestId;
    if (context.userId) info.userId = context.userId;
  }
  return info;
});

const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service: _service, version: _version, environment: _environment, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL ?? (env.NODE_ENV === 'development' ? 'debug' : 'info'),
  format: winston.format.combine(
    withRequestContext(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'blocklucky-backend',
    version: env.APP_VERSION,
    environment: env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console({
      silent: env.NODE_ENV === 'test',
      format: env.NODE_ENV === 'development' ? developmentFormat : winston.format.json(),
    }),
  ],
});

export default logger;
