import prisma from '../config/prisma.config';
import { AppError } from '../utils/response.util';
import logger from '../utils/logger.util';
import { businessEventsTotal } from '../observability/metrics';

export type LedgerActionType =
  | 'TICKET_PURCHASE'
  | 'REFERRAL'
  | 'REWARD_CLAIM'
  | 'SOCIAL_QUEST'
  | 'GIFT_TICKET'
  | 'ADMIN_BONUS';

export class LedgerService {
  public async creditPoints(
    userId: string,
    amount: number,
    actionType: LedgerActionType,
    description?: string
  ) {
    if (amount <= 0) {
      throw new AppError('Le montant à créditer doit être strictement positif', 400);
    }

    const [updatedUser, transaction] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          pointsBalance: { increment: amount },
        },
      }),
      prisma.pointTransaction.create({
        data: {
          userId,
          amount,
          actionType,
          description: description ?? `Crédit de ${amount} EtherPoints (${actionType})`,
        },
      }),
    ]);

    businessEventsTotal.inc({ event: `points_credited_${actionType.toLowerCase()}` });
    logger.info(`+${amount} EtherPoints crédités à ${userId} (${actionType})`);
    return {
      balance: updatedUser.pointsBalance,
      transaction,
    };
  }

  public async debitPoints(
    userId: string,
    amount: number,
    actionType: LedgerActionType = 'REWARD_CLAIM',
    description?: string
  ) {
    if (amount <= 0) {
      throw new AppError('Le montant à débiter doit être strictement positif', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('Utilisateur introuvable', 404);
    }

    if (user.pointsBalance < amount) {
      throw new AppError(
        `Solde d'EtherPoints insuffisant (${user.pointsBalance} disponibles, ${amount} requis)`,
        400
      );
    }

    const [updatedUser, transaction] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          pointsBalance: { decrement: amount },
        },
      }),
      prisma.pointTransaction.create({
        data: {
          userId,
          amount: -amount,
          actionType,
          description: description ?? `Débit de ${amount} EtherPoints (${actionType})`,
        },
      }),
    ]);

    businessEventsTotal.inc({ event: `points_debited_${actionType.toLowerCase()}` });
    logger.info(`-${amount} EtherPoints débités à ${userId} (${actionType})`);
    return {
      balance: updatedUser.pointsBalance,
      transaction,
    };
  }

  public async getUserLedgerHistory(userId: string, limit = 50) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pointsBalance: true },
    });

    if (!user) {
      throw new AppError('Utilisateur introuvable', 404);
    }

    const history = await prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      balance: user.pointsBalance,
      history,
    };
  }
}

export const ledgerService = new LedgerService();
export default ledgerService;
