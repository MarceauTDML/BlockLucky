import { Router } from 'express';
import partnersController from './partners.controllers';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createPartnerSchema,
  createRewardOfferSchema,
  uploadCodesBatchSchema,
} from './partners.validators';

const router = Router();

/**
 * @openapi
 * /api/partners:
 *   get:
 *     tags: [Partners]
 *     summary: Lister toutes les entreprises locales partenaires d'EtherBay
 */
router.get('/', (req, res, next) => partnersController.listPartners(req, res, next));

/**
 * @openapi
 * /api/partners:
 *   post:
 *     tags: [Partners]
 *     summary: Enregistrer une nouvelle entreprise partenaire locale
 */
router.post(
  '/',
  authenticate,
  requireRoles('PARTNER', 'ADMIN'),
  validate(createPartnerSchema),
  (req, res, next) => partnersController.createPartner(req, res, next)
);

/**
 * @openapi
 * /api/partners/offers:
 *   post:
 *     tags: [Partners]
 *     summary: Créer une offre de récompense (Titre, Coût en EtherPoints, Stock, Date d'expiration)
 */
router.post(
  '/offers',
  authenticate,
  requireRoles('PARTNER', 'ADMIN'),
  validate(createRewardOfferSchema),
  (req, res, next) => partnersController.createOffer(req, res, next)
);

/**
 * @openapi
 * /api/partners/codes/upload:
 *   post:
 *     tags: [Partners]
 *     summary: Uploader un lot de 100 codes promos uniques (CSV ou tableau JSON)
 */
router.post(
  '/codes/upload',
  authenticate,
  requireRoles('PARTNER', 'ADMIN'),
  validate(uploadCodesBatchSchema),
  (req, res, next) => partnersController.uploadCodesBatch(req, res, next)
);

/**
 * @openapi
 * /api/partners/{partnerId}/consumption:
 *   get:
 *     tags: [Partners]
 *     summary: Indicateur circulaire de consommation des codes promos réclamés par les habitants
 */
router.get(
  '/:partnerId/consumption',
  authenticate,
  requireRoles('PARTNER', 'ADMIN'),
  (req, res, next) => partnersController.getConsumptionStats(req, res, next)
);

export default router;
