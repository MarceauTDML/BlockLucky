import { Request, Response, NextFunction } from 'express';
import { AppError, sendError } from '../utils/response.util';
import { env } from '../config/env.config';
import logger from '../utils/logger.util';

interface HttpLikeError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
  code?: string;
  meta?: { driverAdapterError?: { cause?: { originalCode?: string } } };
}

interface MappedError {
  status: number;
  message: string;
}

const DUPLICATE_ERROR: MappedError = { status: 409, message: 'Cette ressource existe déjà' };
const CONFLICT_ERROR: MappedError = {
  status: 409,
  message: 'Conflit de transaction, veuillez réessayer',
};
const INTEGRITY_ERROR: MappedError = {
  status: 409,
  message: "L'opération viole une règle d'intégrité des données (solde ou stock insuffisant)",
};

const PRISMA_ERROR_MAP: Record<string, MappedError> = {
  P2002: DUPLICATE_ERROR,
  P2004: INTEGRITY_ERROR,
  P2025: { status: 404, message: 'Ressource introuvable' },
  P2034: CONFLICT_ERROR,
};

const POSTGRES_ERROR_MAP: Record<string, MappedError> = {
  '23505': DUPLICATE_ERROR,
  '23514': INTEGRITY_ERROR,
  '40001': CONFLICT_ERROR,
  '40P01': CONFLICT_ERROR,
  '57014': { status: 503, message: 'La requête a dépassé le délai autorisé' },
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Route introuvable : ${req.method} ${req.originalUrl}`, 404);
};

export const errorHandler = (
  err: HttpLikeError | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.details);
    return;
  }

  const httpError = err as HttpLikeError;

  if (httpError.type === 'entity.parse.failed') {
    sendError(res, 'Corps de requête JSON invalide', 400);
    return;
  }

  if (httpError.type === 'entity.too.large') {
    sendError(res, 'Corps de requête trop volumineux', 413);
    return;
  }

  const postgresCode = httpError.meta?.driverAdapterError?.cause?.originalCode;
  const mapped =
    (postgresCode && POSTGRES_ERROR_MAP[postgresCode]) ||
    (httpError.code && PRISMA_ERROR_MAP[httpError.code]);
  if (mapped) {
    sendError(res, mapped.message, mapped.status);
    return;
  }

  logger.error(`Erreur non gérée sur ${req.method} ${req.originalUrl}: ${err.message}`, {
    stack: err.stack,
    code: httpError.code,
  });

  const message =
    env.NODE_ENV === 'production'
      ? 'Erreur interne du serveur'
      : err.message || 'Erreur interne du serveur';
  sendError(res, message, 500, res.locals.requestId ? { requestId: res.locals.requestId } : undefined);
};
