import { Router } from 'express';
import marketplaceController from './marketplace.controllers';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { idempotency } from '../../middlewares/idempotency.middleware';
import { requireAgeVerification } from '../../middlewares/age-verification.middleware';
import { claimRewardSchema, scratchTicketSchema, usePromoCodeSchema } from './marketplace.validators';

const router = Router();

/**
 * @openapi
 * /api/marketplace/catalog:
 *   get:
 *     tags: [Marketplace]
 *     summary: Consulter le catalogue des récompenses et commerçants partenaires d'EtherBay
 */
router.get('/catalog', (req, res, next) => marketplaceController.getCatalog(req, res, next));

/**
 * @openapi
 * /api/marketplace/rewards/{id}:
 *   get:
 *     tags: [Marketplace]
 *     summary: Obtenir le détail d'une récompense et sa jauge de stock restant
 */
router.get('/rewards/:id', (req, res, next) =>
  marketplaceController.getRewardDetail(req, res, next)
);

/**
 * @openapi
 * /api/marketplace/points:
 *   get:
 *     tags: [Marketplace]
 *     summary: Obtenir le compteur dynamique d'EtherPoints et l'historique du Ledger
 */
router.get('/points', authenticate, (req, res, next) =>
  marketplaceController.getPointsBalance(req, res, next)
);

/**
 * @openapi
 * /api/marketplace/claim:
 *   post:
 *     tags: [Marketplace]
 *     summary: Échanger ses EtherPoints contre une carte à gratter virtuelle (Scratch Card)
 */
router.post(
  '/claim',
  authenticate,
  requireAgeVerification,
  idempotency,
  validate(claimRewardSchema),
  (req, res, next) => marketplaceController.claimReward(req, res, next)
);

/**
 * @openapi
 * /api/marketplace/scratch:
 *   post:
 *     tags: [Marketplace]
 *     summary: Acheter un ticket à gratter en EtherPoints (violet ou lucky, âge vérifié requis) qui attribue au hasard une récompense partenaire en stock
 */
router.post(
  '/scratch',
  authenticate,
  requireAgeVerification,
  idempotency,
  validate(scratchTicketSchema),
  (req, res, next) => marketplaceController.buyScratchTicket(req, res, next)
);

/**
 * @openapi
 * /api/marketplace/my-codes:
 *   get:
 *     tags: [Marketplace]
 *     summary: Obtenir son Wallet de Récompenses (Mes Codes Promos + QR Codes à scanner)
 */
router.get('/my-codes', authenticate, (req, res, next) =>
  marketplaceController.getMyCodes(req, res, next)
);

/**
 * @openapi
 * /api/marketplace/redeem:
 *   post:
 *     tags: [Marketplace]
 *     summary: Valider un QR Code / Code Promo client en magasin (Partenaire ou Admin)
 */
router.post(
  '/redeem',
  authenticate,
  requireRoles('PARTNER', 'ADMIN'),
  validate(usePromoCodeSchema),
  (req, res, next) => marketplaceController.redeemCodeInStore(req, res, next)
);

export default router;
