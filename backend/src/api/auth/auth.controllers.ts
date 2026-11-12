import { Request, Response, NextFunction } from 'express';
import authService from './auth.services';
import oauthVerifierService from '../../services/oauth-verifier.service';
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

  public async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.signup(req.body);
      sendSuccess(res, result, 'Code de vérification envoyé par email', 201);
    } catch (error) {
      next(error);
    }
  }

  public async signin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.signin(req.body);
      sendSuccess(res, result, 'Authentification réussie', 200);
    } catch (error) {
      next(error);
    }
  }

  public async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.forgotPassword(req.body.email);
      sendSuccess(res, result, 'Si un compte existe pour cette adresse, un code de réinitialisation a été envoyé', 200);
    } catch (error) {
      next(error);
    }
  }

  public async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.resetPassword(req.body);
      sendSuccess(res, result, 'Mot de passe mis à jour, reconnectez-vous', 200);
    } catch (error) {
      next(error);
    }
  }

  public async requestEmailChange(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Non authentifié', 401);
      const result = await authService.requestEmailChange(userId, req.body);
      sendSuccess(res, result, 'Code de confirmation envoyé à la nouvelle adresse', 200);
    } catch (error) {
      next(error);
    }
  }

  public async confirmEmailChange(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Non authentifié', 401);
      const result = await authService.confirmEmailChange(userId, req.body.code);
      sendSuccess(res, result, 'Adresse email mise à jour', 200);
    } catch (error) {
      next(error);
    }
  }

  public async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Non authentifié', 401);
      const result = await authService.changePassword(userId, req.body);
      sendSuccess(res, result, 'Mot de passe mis à jour, vos autres sessions ont été déconnectées', 200);
    } catch (error) {
      next(error);
    }
  }

  public async googleSignIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identity = await oauthVerifierService.verifyGoogle(req.body.idToken);
      const result = await authService.oauthLogin(identity);
      sendSuccess(res, result, 'Authentification Google réussie', 200);
    } catch (error) {
      next(error);
    }
  }

  public async appleSignIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identity = await oauthVerifierService.verifyApple(req.body.identityToken);
      const result = await authService.oauthLogin(identity);
      sendSuccess(res, result, 'Authentification Apple réussie', 200);
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
      const targetUserId = req.user?.userId || req.body.userId;
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
      if (!req.session) throw new AppError('Non authentifié', 401);
      const result = await authService.disable2FA(req.session, req.body.code);
      sendSuccess(res, result, 'Double authentification (2FA) désactivée', 200);
    } catch (error) {
      next(error);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.session) throw new AppError('Non authentifié', 401);
      const result = await authService.logout(req.session, Boolean(req.body?.allDevices));
      res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
      sendSuccess(res, result, 'Déconnexion effectuée', 200);
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
