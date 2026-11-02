import { Request, Response, NextFunction } from 'express';
import authService from './auth.services';
import { sendSuccess, AppError } from '../../utils/response.util';

export class AuthController {
  public async socialLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.socialLogin(req.body);
      sendSuccess(res, result, 'Authentification réussie', 200);
    } catch (error) {
      next(error);
    }
  }

  public async setup2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Non authentifié', 401);
      const result = await authService.setup2FA(userId, req.body.method);
      sendSuccess(res, result, 'Configuration 2FA initialisée', 200);
    } catch (error) {
      next(error);
    }
  }

  public async verify2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = req.body.userId || req.user?.userId;
      if (!targetUserId) {
        throw new AppError('Identifiant utilisateur requis pour vérifier le code 2FA', 400);
      }
      const result = await authService.verify2FA(targetUserId, req.body.code);
      sendSuccess(res, result, 'Double authentification (2FA) vérifiée avec succès', 200);
    } catch (error) {
      next(error);
    }
  }

  public async disable2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Non authentifié', 401);
      const result = await authService.disable2FA(userId);
      sendSuccess(res, result, 'Double authentification (2FA) désactivée', 200);
    } catch (error) {
      next(error);
    }
  }

  public async getOnboarding(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slides = authService.getOnboardingSlides();
      sendSuccess(res, { slides }, 'Écrans onboarding récupérés', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
export default authController;
