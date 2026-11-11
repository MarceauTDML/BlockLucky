import { Router } from 'express';
import lotteryController from './lottery.controllers';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { idempotency } from '../../middlewares/idempotency.middleware';
import { buyTicketSchema, claimPrizeSchema, giftTicketSchema, triggerDrawSchema } from './lottery.validators';

const router = Router();

/**
 * @openapi
 * /api/lottery/status:
 *   get:
 *     tags: [Lottery]
 *     summary: Obtenir le compte à rebours, la jauge de progression (10k), les paliers et la preuve Chainlink VRF
 */
router.get('/status', (req, res, next) => lotteryController.getStatus(req, res, next));

/**
 * @openapi
 * /api/lottery/transparency-charter:
 *   get:
 *     tags: [Lottery]
 *     summary: Obtenir la charte de transparence du Smart Contract vulgarisée
 */
router.get('/transparency-charter', (req, res, next) =>
  lotteryController.getTransparencyCharter(req, res, next)
);

/**
 * @openapi
 * /api/lottery/leaderboard:
 *   get:
 *     tags: [Lottery]
 *     summary: Obtenir le classement anonymisé des meilleurs ambassadeurs d'EtherBay
 */
router.get('/leaderboard', (req, res, next) => lotteryController.getLeaderboard(req, res, next));

/**
 * @openapi
 * /api/lottery/poap/{file}:
 *   get:
 *     tags: [Lottery]
 *     summary: Métadonnées ERC-721 (roundId.json) et visuel (roundId.svg) du badge POAP d'un tour
 */
router.get('/poap/:file', (req, res, next) => lotteryController.getPoapMetadata(req, res, next));

/**
 * @openapi
 * /api/lottery/buy:
 *   post:
 *     tags: [Lottery]
 *     summary: Acheter un ou plusieurs tickets en 1 clic, transaction signée par le portefeuille intégré du citoyen, et gagner +50 EtherPoints
 */
router.post(
  '/buy',
  authenticate,
  idempotency,
  validate(buyTicketSchema),
  (req, res, next) => lotteryController.buyTicket(req, res, next)
);

/**
 * @openapi
 * /api/lottery/gift:
 *   post:
 *     tags: [Lottery]
 *     summary: Offrir un ticket de loterie à un proche par email (Cadeau viral)
 */
router.post(
  '/gift',
  authenticate,
  idempotency,
  validate(giftTicketSchema),
  (req, res, next) => lotteryController.giftTicket(req, res, next)
);

/**
 * @openapi
 * /api/lottery/my-tickets:
 *   get:
 *     tags: [Lottery]
 *     summary: Historique de transparence (liens Etherscan) et Galerie POAP (NFT)
 */
router.get('/my-tickets', authenticate, (req, res, next) =>
  lotteryController.getMyTransactions(req, res, next)
);

/**
 * @openapi
 * /api/lottery/wallet:
 *   get:
 *     tags: [Lottery]
 *     summary: Portefeuille Ethereum intégré du citoyen (adresse, solde en ethers fictifs, dotation de bienvenue)
 */
router.get('/wallet', authenticate, (req, res, next) => lotteryController.getWallet(req, res, next));

/**
 * @openapi
 * /api/lottery/claim-prize:
 *   post:
 *     tags: [Lottery]
 *     summary: Retirer la cagnotte gagnée depuis le Smart Contract vers le portefeuille du gagnant
 */
router.post(
  '/claim-prize',
  authenticate,
  idempotency,
  validate(claimPrizeSchema),
  (req, res, next) => lotteryController.claimPrize(req, res, next)
);

/**
 * @openapi
 * /api/lottery/draw:
 *   post:
 *     tags: [Lottery]
 *     summary: Déclencher le tirage au sort certifié Chainlink VRF (Admin)
 */
router.post(
  '/draw',
  authenticate,
  requireRoles('ADMIN'),
  validate(triggerDrawSchema),
  (req, res, next) => lotteryController.triggerDraw(req, res, next)
);

/**
 * @openapi
 * /api/lottery/refund:
 *   post:
 *     tags: [Lottery]
 *     summary: Annuler le round et déclencher le remboursement automatique (Auto-Refund)
 */
router.post(
  '/refund',
  authenticate,
  requireRoles('ADMIN'),
  (req, res, next) => lotteryController.cancelAndRefund(req, res, next)
);

export default router;
