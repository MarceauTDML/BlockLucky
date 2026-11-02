import { Router } from 'express';
import blockchainWebhookController from './blockchain.webhook';

const router = Router();

/**
 * @openapi
 * /api/webhooks/blockchain:
 *   post:
 *     tags: [Webhooks]
 *     summary: Webhook temps réel pour indexer les événements Smart Contract (TicketPurchased, WinnerPicked, Fallback)
 */
router.post('/blockchain', (req, res, next) =>
  blockchainWebhookController.handleWebhookEvent(req, res, next)
);

export default router;
