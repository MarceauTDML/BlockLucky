import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.util';

export const requireRoles = (...allowedRoles: Array<'USER' | 'PARTNER' | 'ADMIN'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentification requise', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Accès refusé (RBAC) : Rôle ${allowedRoles.join(' ou ')} requis pour cette ressource`,
        403
      );
      return;
    }

    next();
  };
};
