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
 *     summary: Webhook signé d'indexation des événements, réservé au mode simulé (409 en mode onchain)
 */
router.post(
  '/blockchain',
  requireWebhookSignature,
  validate(blockchainWebhookSchema),
  (req, res, next) => blockchainWebhookController.handleWebhookEvent(req, res, next)
);

export default router;
