import { Router } from 'express';
import analyticsController from './analytics.controllers';
import { authenticate, optionalAuthenticate } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { trackEventSchema } from './analytics.validators';

const router = Router();

/**
 * @openapi
 * /api/analytics/track:
 *   post:
 *     tags: [Analytics]
 *     summary: Enregistrer un événement analytique ou un tag d'acquisition UTM (Twitter, Instagram...)
 */
router.post(
  '/track',
  optionalAuthenticate,
  validate(trackEventSchema),
  (req, res, next) => analyticsController.trackEvent(req, res, next)
);

/**
 * @openapi
 * /api/analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Obtenir les graphiques démographiques (18-35 ans) et courbes d'acquisition UTM (Mairie Admin)
 */
router.get(
  '/dashboard',
  authenticate,
  requireRoles('ADMIN'),
  (req, res, next) => analyticsController.getDashboardMetrics(req, res, next)
);

export default router;
