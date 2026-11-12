import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.config';
import { env } from '../config/env.config';
import { sendError } from '../utils/response.util';

export const AGE_VERIFICATION_REQUIRED_MESSAGE = 'Vérifiez votre âge pour jouer.';

export const requireAgeVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!env.AGE_VERIFICATION_REQUIRED) {
    next();
    return;
  }
  if (!req.user) {
    sendError(res, 'Authentification requise', 401);
    return;
  }

  try {
    const account = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { ageVerificationStatus: true },
    });
    const status = account?.ageVerificationStatus ?? 'NONE';
    if (status !== 'VERIFIED') {
      sendError(res, AGE_VERIFICATION_REQUIRED_MESSAGE, 403, { code: 'AGE_VERIFICATION_REQUIRED', status });
      return;
    }
  } catch {
    sendError(res, "Vérification de l'âge impossible pour le moment", 503);
    return;
  }

  next();
};
