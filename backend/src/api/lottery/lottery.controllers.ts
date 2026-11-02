import { Request, Response, NextFunction } from 'express';
import lotteryService from './lottery.services';
import { sendSuccess, AppError } from '../../utils/response.util';
import { getPaginationParams, buildPaginationMeta } from '../../utils/pagination.util';

export class LotteryController {
  public async getStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await lotteryService.getCurrentLotteryStatus();
      sendSuccess(res, status, 'Statut de la loterie récupéré avec succès');
    } catch (error) {
      next(error);
    }
  }

  public async buyTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const result = await lotteryService.buyGaslessTicket(userId, req.body);
      sendSuccess(res, result, 'Ticket acheté avec succès (Transaction Gasless)', 201);
    } catch (error) {
      next(error);
    }
  }

  public async giftTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const result = await lotteryService.giftTicketToFriend(userId, req.body);
      sendSuccess(res, result, 'Ticket offert avec succès à votre proche !', 201);
    } catch (error) {
      next(error);
    }
  }

  public async triggerDraw(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await lotteryService.executeChainlinkDraw(req.body?.roundId);
      sendSuccess(res, result, 'Tirage au sort Chainlink VRF exécuté avec succès');
    } catch (error) {
      next(error);
    }
  }

  public async cancelAndRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await lotteryService.CancelAndAutoRefundRound(req.body?.roundId);
      sendSuccess(res, result, 'Loterie annulée et remboursement automatique déclenché');
    } catch (error) {
      next(error);
    }
  }

  public async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 20;
      const leaderboard = await lotteryService.getLeaderboard(limit);
      sendSuccess(res, { leaderboard }, 'Classement des ambassadeurs récupéré');
    } catch (error) {
      next(error);
    }
  }

  public async getMyTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError('Authentification requise', 401);
      const { page, limit } = getPaginationParams(req.query as any);
      const result = await lotteryService.getUserTransactionsAndPoaps(userId, page, limit);
      const meta = buildPaginationMeta(result.total, page, limit);
      sendSuccess(
        res,
        {
          walletAddress: result.walletAddress,
          tickets: result.tickets,
          poapBadges: result.poapBadges,
        },
        'Historique de transparence et galerie POAP récupérés',
        200,
        meta
      );
    } catch (error) {
      next(error);
    }
  }

  public async getTransparencyCharter(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const charter = lotteryService.getTransparencyCharter();
      sendSuccess(res, charter, 'Charte de transparence récupérée');
    } catch (error) {
      next(error);
    }
  }
}

export const lotteryController = new LotteryController();
export default lotteryController;
