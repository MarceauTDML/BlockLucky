import { Request, Response, NextFunction } from 'express';
import adminService from './admin.services';
import { sendSuccess, AppError } from '../../utils/response.util';

export class AdminController {
  public async getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getCentralDashboard();
      sendSuccess(res, data, 'Tableau de bord central Mairie récupéré');
    } catch (error) {
      next(error);
    }
  }

  public async toggleCircuitBreaker(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError('Authentification Admin requise', 401);
      const result = await adminService.toggleCircuitBreaker(
        adminId,
        req.body.paused,
        req.body.reason
      );
      sendSuccess(
        res,
        result,
        req.body.paused
          ? "Circuit Breaker ACTIVÉ : Smart Contract mis en pause d'urgence"
          : 'Circuit Breaker DÉSACTIVÉ : Reprise normale du Smart Contract'
      );
    } catch (error) {
      next(error);
    }
  }

  public async withdrawTreasury(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError('Authentification Admin requise', 401);
      const result = await adminService.withdrawMunicipalityTreasury(adminId, req.body);
      sendSuccess(
        res,
        result,
        'Retrait de trésorerie vers le portefeuille multi-signatures exécuté'
      );
    } catch (error) {
      next(error);
    }
  }

  public async updatePartnerStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError('Authentification Admin requise', 401);
      const partnerId = String(req.params.partnerId);
      const partner = await adminService.updatePartnerApproval(
        adminId,
        partnerId,
        req.body.isActive
      );
      sendSuccess(res, { partner }, 'Statut du partenaire mis à jour');
    } catch (error) {
      next(error);
    }
  }

  public async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 100;
      const logs = await adminService.getAuditLogs(limit);
      sendSuccess(res, { logs }, "Journal des logs d'audit récupéré");
    } catch (error) {
      next(error);
    }
  }

  public async exportReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError('Authentification Admin requise', 401);
      const format =
        String(req.query.format || 'CSV').toUpperCase() === 'PDF' ? 'PDF' : 'CSV';
      const report = await adminService.generateAccountingReport(adminId, format);
      sendSuccess(res, report, `Rapport comptable ${format} généré avec succès`);
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
export default adminController;
