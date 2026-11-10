import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.config';
import { env } from '../config/env.config';
import { sendError } from '../utils/response.util';

type Role = 'USER' | 'PARTNER' | 'ADMIN';

export const requireRoles = (...allowedRoles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      sendError(res, 'Authentification requise', 401);
      return;
    }

    if (allowedRoles.length === 0 || !allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Accès refusé (RBAC) : Rôle ${allowedRoles.join(' ou ')} requis pour cette ressource`,
        403
      );
      return;
    }

    try {
      const account = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { role: true, deletedAt: true, isTwoFactorEnabled: true },
      });

      if (!account || account.deletedAt || account.role !== req.user.role) {
        sendError(res, 'Droits révoqués ou modifiés : reconnectez-vous', 403);
        return;
      }

      if (account.role === 'ADMIN' && env.ADMIN_MFA_REQUIRED && !account.isTwoFactorEnabled) {
        sendError(
          res,
          "La double authentification est obligatoire pour les comptes d'administration. Activez-la depuis votre profil.",
          403
        );
        return;
      }
    } catch {
      sendError(res, 'Vérification des droits impossible', 503);
      return;
    }

    next();
  };
};
