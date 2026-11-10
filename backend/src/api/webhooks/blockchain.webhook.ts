import { Request, Response, NextFunction } from 'express';
import blockchainIndexerWorker from '../../workers/blockchain-indexer.worker';
import blockchainService from '../../services/blockchain.service';
import { sendSuccess, AppError } from '../../utils/response.util';

export class BlockchainWebhookController {
  public async handleWebhookEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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
