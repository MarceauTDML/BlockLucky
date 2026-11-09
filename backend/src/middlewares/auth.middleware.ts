import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import { JwtPayload } from '../types/api.types';
import { sendError } from '../utils/response.util';
import { setContextUserId } from '../observability/request-context';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentification requise (Token JWT manquant)', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    sendError(res, 'Format de token invalide', 401);
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    setContextUserId(decoded.userId);
    next();
  } catch {
    sendError(res, 'Session expirée ou token JWT invalide', 401);
  }
};

export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        req.user = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        setContextUserId(req.user.userId);
      } catch {}
    }
  }
  next();
};
