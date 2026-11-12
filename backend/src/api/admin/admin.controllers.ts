import { Request, Response, NextFunction } from 'express';
import adminService from './admin.services';
import { sendSuccess, AppError } from '../../utils/response.util';
import { buildPaginationMeta, getPaginationParams } from '../../utils/pagination.util';

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

  public async listIdentityVerifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = String(req.query.status ?? 'PENDING') as 'PENDING' | 'VERIFIED' | 'REJECTED';
      const { page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
      const { verifications, total } = await adminService.listIdentityVerifications(status, page, limit);
      sendSuccess(
        res,
        { verifications },
        "Demandes de vérification d'identité récupérées",
        200,
        buildPaginationMeta(total, page, limit)
      );
    } catch (error) {
      next(error);
    }
  }

  public async getIdentityVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError('Authentification Admin requise', 401);
      const verification = await adminService.getIdentityVerification(adminId, String(req.params.id));
      res.setHeader('Cache-Control', 'no-store');
      sendSuccess(res, { verification }, "Demande de vérification d'identité récupérée");
    } catch (error) {
      next(error);
    }
  }

  public async decideIdentityVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError('Authentification Admin requise', 401);
      const decision = await adminService.decideIdentityVerification(adminId, String(req.params.id), req.body);
      sendSuccess(
        res,
        { decision },
        decision.status === 'VERIFIED' ? 'Âge du citoyen vérifié' : "Pièce d'identité refusée"
      );
    } catch (error) {
      next(error);
    }
  }

  public async listStaffAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRole = String(req.query.role ?? '').toUpperCase();
      const role = rawRole === 'ADMIN' || rawRole === 'PARTNER' ? rawRole : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search.trim() || undefined : undefined;
      const { page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
      const { accounts, total } = await adminService.listStaffAccounts({ role, search }, page, limit);
      sendSuccess(
        res,
        { accounts },
        'Comptes Mairie et partenaires récupérés',
        200,
        buildPaginationMeta(total, page, limit)
      );
    } catch (error) {
      next(error);
    }
  }

  public async createStaffAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError('Authentification Admin requise', 401);
      const result = await adminService.createStaffAccount(adminId, req.body);
      sendSuccess(
        res,
        result,
        result.created ? 'Compte créé et invitation envoyée' : 'Rôle attribué et invitation envoyée',
        result.created ? 201 : 200
      );
    } catch (error) {
      next(error);
    }
  }

  public async updateStaffRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.userId;
      if (!adminId) throw new AppError('Authentification Admin requise', 401);
      const account = await adminService.updateStaffRole(adminId, String(req.params.id), req.body.role);
      sendSuccess(res, { account }, account.role === 'USER' ? 'Rôle retiré' : 'Rôle du compte mis à jour');
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
