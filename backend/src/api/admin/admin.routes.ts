import { Router } from 'express';
import adminController from './admin.controllers';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  circuitBreakerSchema,
  treasuryWithdrawalSchema,
  approvePartnerSchema,
} from './admin.validators';

const router = Router();

router.use(authenticate, requireRoles('ADMIN'));

/**
 * @openapi
 * /api/admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Tableau de Bord Central Mairie (KPIs globaux, Cagnotte, Tickets vendus, Démographie)
 */
router.get('/dashboard', (req, res, next) => adminController.getDashboard(req, res, next));

/**
 * @openapi
 * /api/admin/circuit-breaker:
 *   post:
 *     tags: [Admin]
 *     summary: Interrupteur d'Urgence (Circuit Breaker) pour mettre en pause ou reprendre le Smart Contract
 */
router.post(
  '/circuit-breaker',
  validate(circuitBreakerSchema),
  (req, res, next) => adminController.toggleCircuitBreaker(req, res, next)
);

/**
 * @openapi
 * /api/admin/treasury/withdraw:
 *   post:
 *     tags: [Admin]
 *     summary: Retirer la part de trésorerie de la Mairie vers un portefeuille multi-signatures
 */
router.post(
  '/treasury/withdraw',
  validate(treasuryWithdrawalSchema),
  (req, res, next) => adminController.withdrawTreasury(req, res, next)
);

/**
 * @openapi
 * /api/admin/partners/{partnerId}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Approuver ou suspendre une entreprise partenaire locale
 */
router.patch(
  '/partners/:partnerId/status',
  validate(approvePartnerSchema),
  (req, res, next) => adminController.updatePartnerStatus(req, res, next)
);

/**
 * @openapi
 * /api/admin/reports/export:
 *   get:
 *     tags: [Admin]
 *     summary: Générateur de rapports analytiques et comptables (CSV ou PDF)
 */
router.get('/reports/export', (req, res, next) =>
  adminController.exportReport(req, res, next)
);

/**
 * @openapi
 * /api/admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: Tableau chronologique de traçabilité des actions effectuées par les administrateurs Mairie
 */
router.get('/audit-logs', (req, res, next) => adminController.getAuditLogs(req, res, next));

export default router;
