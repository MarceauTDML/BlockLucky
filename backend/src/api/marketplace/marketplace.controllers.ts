import { Request, Response, NextFunction } from 'express';
import marketplaceService from './marketplace.services';
import ledgerService from '../../services/ledger.service';
import { sendSuccess, AppError } from '../../utils/response.util';

export class MarketplaceController {
  public async getCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const catalog = await marketplaceService.getCatalog();
      sendSuccess(res, { catalog }, 'Catalogue des récompenses partenaires récupéré');
    } catch (error) {
      next(error);
    }
  }

  public async getRewardDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rewardId = String(req.params.id);
      const reward = await marketplaceService.getRewardDetails(rewardId);
      sendSuccess(res, { reward }, 'Détails de la récompense récupérés');
    } catch (error) {
      next(error);
    }
  }

  public async claimReward(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const result = await marketplaceService.claimRewardScratchCard(userId, req.body.rewardId);
      sendSuccess(res, result, 'Récompense débloquée ! Grattez votre carte virtuelle.', 201);
    } catch (error) {
      next(error);
    }
  }

  public async getMyCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const codes = await marketplaceService.getMyWalletCodes(userId);
      sendSuccess(res, { codes }, 'Wallet de codes promos récupéré');
    } catch (error) {
      next(error);
    }
  }

  public async getPointsBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const result = await ledgerService.getUserLedgerHistory(userId);
      sendSuccess(res, result, "Solde et historique d'EtherPoints récupérés");
    } catch (error) {
      next(error);
    }
  }

  public async redeemCodeInStore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await marketplaceService.validateAndRedeemStoreCode(req.body.uniqueCode);
      sendSuccess(res, result, 'Code promo validé en magasin avec succès');
    } catch (error) {
      next(error);
    }
  }
}

export const marketplaceController = new MarketplaceController();
export default marketplaceController;
