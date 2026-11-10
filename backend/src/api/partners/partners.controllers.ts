import { Request, Response, NextFunction } from 'express';
import partnersService from './partners.services';
import { sendSuccess, AppError } from '../../utils/response.util';
import { PartnerActor } from './partners.services';

const actorOf = (req: Request): PartnerActor => {
  if (!req.user) throw new AppError('Authentification requise', 401);
  return { userId: req.user.userId, role: req.user.role };
};

export class PartnersController {
  public async listPartners(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const partners = await partnersService.listPartners();
      sendSuccess(res, { partners }, 'Liste des entreprises partenaires récupérée');
    } catch (error) {
      next(error);
    }
  }

  public async createPartner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const partner = await partnersService.createPartner(req.body, actorOf(req));
      sendSuccess(res, { partner }, 'Entreprise partenaire créée avec succès', 201);
    } catch (error) {
      next(error);
    }
  }

  public async createOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const offer = await partnersService.createOffer(req.body, actorOf(req));
      sendSuccess(res, { offer }, 'Offre partenaire créée avec succès', 201);
    } catch (error) {
      next(error);
    }
  }

  public async uploadCodesBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await partnersService.uploadPromoCodesBatch(req.body, actorOf(req));
      sendSuccess(res, result, 'Lot de codes promos uniques injecté avec succès', 201);
    } catch (error) {
      next(error);
    }
  }

  public async getConsumptionStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const partnerId = String(req.params.partnerId);
      const stats = await partnersService.getPartnerConsumptionStats(partnerId, actorOf(req));
      sendSuccess(res, stats, 'Indicateur de consommation des codes récupéré');
    } catch (error) {
      next(error);
    }
  }
}

export const partnersController = new PartnersController();
export default partnersController;
