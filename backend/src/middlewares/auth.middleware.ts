import { Request, Response, NextFunction } from 'express';
import sessionService from '../services/session.service';
import { sendError } from '../utils/response.util';
import { setContextUserId } from '../observability/request-context';

const extractBearer = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
};

const attach = (req: Request, session: Awaited<ReturnType<typeof sessionService.verify>>) => {
  req.session = session;
  req.user = {
    userId: session.userId,
    walletAddress: session.walletAddress,
    role: session.role,
    twoFactorVerified: session.twoFactorVerified ?? false,
  };
  setContextUserId(session.userId);
};

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = extractBearer(req);
  if (!token) {
    sendError(res, 'Authentification requise (Token JWT manquant)', 401);
    return;
  }

  try {
    attach(req, await sessionService.verify(token));
    next();
  } catch {
    sendError(res, 'Session expirée ou token JWT invalide', 401);
  }
};

export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearer(req);
  if (token) {
    try {
      attach(req, await sessionService.verify(token));
    } catch {}
  }
  next();
};
