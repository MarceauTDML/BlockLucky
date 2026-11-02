import { Request, Response, NextFunction } from 'express';
import { AppError, sendError } from '../utils/response.util';
import logger from '../utils/logger.util';

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Route introuvable : ${req.method} ${req.originalUrl}`, 404);
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.details);
    return;
  }

  logger.error(`Erreur non gérée sur ${req.method} ${req.originalUrl}: ${err.message}`, {
    stack: err.stack,
  });

  sendError(res, err.message || 'Erreur interne du serveur', 500);
};
