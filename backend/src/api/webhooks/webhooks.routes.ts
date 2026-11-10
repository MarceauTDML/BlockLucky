import { Router } from 'express';
import blockchainWebhookController from './blockchain.webhook';
import { requireWebhookSignature } from './webhook-signature';
import { blockchainWebhookSchema } from './webhooks.validators';
import { validate } from '../../middlewares/validate.middleware';

const router = Router();

/**
 * @openapi
 * /api/webhooks/blockchain:
 *   post:
 *     tags: [Webhooks]
 *     summary: Webhook temps réel pour indexer les événements Smart Contract (TicketPurchased, WinnerPicked, Fallback)
 */
router.post(
  '/blockchain',
  requireWebhookSignature,
  validate(blockchainWebhookSchema),
  (req, res, next) => blockchainWebhookController.handleWebhookEvent(req, res, next)
);

export default router;
