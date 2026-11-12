import { Request, Response, NextFunction } from 'express';
import userService from './user.services';
import { sendSuccess, AppError } from '../../utils/response.util';

export class UserController {
  public async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const profile = await userService.getProfile(userId);
      sendSuccess(res, { profile }, 'Profil utilisateur récupéré');
    } catch (error) {
      next(error);
    }
  }

  public async submitIdentity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const result = await userService.submitIdentity(userId, req.body);
      sendSuccess(res, result, "Pièce d'identité transmise à la Mairie pour vérification", 201);
    } catch (error) {
      next(error);
    }
  }

  public async getIdentity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const result = await userService.getIdentityStatus(userId);
      sendSuccess(res, result, "Statut de la vérification d'âge récupéré");
    } catch (error) {
      next(error);
    }
  }

  public async getReferrals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const referralInfo = await userService.getReferralInfo(userId);
      sendSuccess(res, referralInfo, 'Informations de parrainage récupérées');
    } catch (error) {
      next(error);
    }
  }

  public async getQuests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const quests = await userService.getSocialQuests(userId);
      sendSuccess(res, { quests }, 'Quêtes sociales récupérées');
    } catch (error) {
      next(error);
    }
  }

  public async completeQuest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const result = await userService.completeSocialQuest(userId, req.body.questId);
      sendSuccess(res, result, 'Quête sociale validée ! EtherPoints bonus crédités.');
    } catch (error) {
      next(error);
    }
  }

  public async setResponsibleLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const result = await userService.setResponsibleGamingLimit(
        userId,
        req.body.maxTicketsPerRound
      );
      sendSuccess(res, result, "Limite d'achat Jeu Responsable enregistrée");
    } catch (error) {
      next(error);
    }
  }

  public async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const preferences = await userService.updatePreferences(userId, req.body);
      sendSuccess(res, { preferences }, 'Préférences de thème et langue mises à jour');
    } catch (error) {
      next(error);
    }
  }

  public async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const notifications = await userService.getPushNotificationsHistory(userId);
      sendSuccess(res, { notifications }, 'Centre de notifications push récupéré');
    } catch (error) {
      next(error);
    }
  }

  public async exportGdpr(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const exportData = await userService.exportGdprData(userId);
      sendSuccess(res, exportData, 'Export de vos données personnelles RGPD (JSON) généré');
    } catch (error) {
      next(error);
    }
  }

  public async requestGdprDeletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const result = await userService.requestGdprAccountDeletion(userId);
      sendSuccess(res, result, 'Email de confirmation de suppression RGPD envoyé');
    } catch (error) {
      next(error);
    }
  }

  public async confirmGdprDeletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.confirmGdprAccountDeletion(req.body.token);
      sendSuccess(res, result, 'Compte anonymisé et supprimé conformément au RGPD');
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
export default userController;
