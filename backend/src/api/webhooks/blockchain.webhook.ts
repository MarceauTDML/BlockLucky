import { Request, Response, NextFunction } from 'express';
import blockchainIndexerWorker from '../../workers/blockchain-indexer.worker';
import blockchainService from '../../services/blockchain.service';
import { env } from '../../config/env.config';
import { sendSuccess, AppError } from '../../utils/response.util';
import { timingSafeEqual } from 'crypto';

const isValidSecret = (received: string | string[] | undefined): boolean => {
  if (typeof received !== 'string') return false;
  const expected = Buffer.from(env.WEBHOOK_SECRET);
  const provided = Buffer.from(received);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
};

export class BlockchainWebhookController {
  public async handleWebhookEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const secretHeader = req.headers['x-webhook-secret'];
      if (!isValidSecret(secretHeader)) {
        throw new AppError('Signature de webhook blockchain invalide', 401);
      }

      const { eventType, payload } = req.body;

      if (eventType === 'TICKET_PURCHASED') {
        const result = await blockchainIndexerWorker.processTicketPurchasedEvent({
          transactionHash: payload.transactionHash,
          blockNumber: Number(payload.blockNumber) || 19500001,
          walletAddress: payload.walletAddress,
          contractRoundId: Number(payload.contractRoundId) || 1,
          ticketPriceEth: Number(payload.ticketPriceEth) || 0.01,
        });
        sendSuccess(res, result, 'Événement TicketPurchased indexé avec succès', 200);
        return;
      }

      if (eventType === 'WINNER_PICKED') {
        const result = await blockchainIndexerWorker.processDrawWinnerEvent({
          contractRoundId: Number(payload.contractRoundId) || 1,
          winnerWallet: payload.winnerWallet,
          chainlinkRequestId: payload.chainlinkRequestId,
        });
        sendSuccess(res, { round: result }, 'Événement WinnerPicked indexé avec succès', 200);
        return;
      }

      if (eventType === 'RPC_FALLBACK_SWITCH') {
        await blockchainService.switchToFallback(Boolean(payload?.active));
        const status = await blockchainService.getNetworkStatus();
        sendSuccess(res, status, 'Statut du réseau RPC Fallback mis à jour', 200);
        return;
      }

      throw new AppError(`Type d'événement webhook non supporté: ${eventType}`, 400);
    } catch (error) {
      next(error);
    }
  }
}

export const blockchainWebhookController = new BlockchainWebhookController();
export default blockchainWebhookController;
