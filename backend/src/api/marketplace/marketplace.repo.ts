import prisma from '../../config/prisma.config';
import { AppError } from '../../utils/response.util';

export class MarketplaceRepository {
  public async getCatalogWithPartners() {
    return prisma.rewardCatalog.findMany({
      where: {
        isActive: true,
        partner: { isActive: true },
      },
      include: {
        partner: true,
      },
      orderBy: { costInPoints: 'asc' },
    });
  }

  public async findRewardById(rewardId: string) {
    return prisma.rewardCatalog.findUnique({
      where: { id: rewardId },
      include: {
        partner: true,
        _count: { select: { claimedRewards: true } },
      },
    });
  }

  public async decrementStockAndCreateClaim(data: {
    userId: string;
    rewardId: string;
    uniqueCode: string;
  }) {
    const [updatedReward, claimed] = await prisma.$transaction([
      prisma.rewardCatalog.update({
        where: { id: data.rewardId },
        data: {
          remainingStock: { decrement: 1 },
        },
      }),
      prisma.claimedReward.create({
        data: {
          userId: data.userId,
          rewardId: data.rewardId,
          uniqueCode: data.uniqueCode,
          isUsed: false,
        },
        include: {
          rewardCatalog: {
            include: { partner: true },
          },
        },
      }),
    ]);

    return { updatedReward, claimed };
  }

  public async listScratchableRewards() {
    return prisma.rewardCatalog.findMany({
      where: { isActive: true, remainingStock: { gt: 0 }, partner: { isActive: true } },
      select: { id: true, costInPoints: true },
    });
  }

  public async drawScratchReward(data: {
    userId: string;
    rewardId: string;
    cost: number;
    uniqueCode: string;
    description: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const debited = await tx.user.updateMany({
        where: { id: data.userId, deletedAt: null, pointsBalance: { gte: data.cost } },
        data: { pointsBalance: { decrement: data.cost } },
      });
      if (debited.count === 0) return { outcome: 'INSUFFICIENT_POINTS' as const };

      const reserved = await tx.rewardCatalog.updateMany({
        where: { id: data.rewardId, isActive: true, remainingStock: { gt: 0 } },
        data: { remainingStock: { decrement: 1 } },
      });
      if (reserved.count === 0) throw new AppError('Cette récompense vient d’être épuisée, veuillez réessayer.', 409);

      const claimed = await tx.claimedReward.create({
        data: { userId: data.userId, rewardId: data.rewardId, uniqueCode: data.uniqueCode, isUsed: false },
        include: { rewardCatalog: { include: { partner: true } } },
      });
      await tx.pointTransaction.create({
        data: { userId: data.userId, amount: -data.cost, actionType: 'REWARD_CLAIM', description: data.description },
      });
      const [user, reward] = await Promise.all([
        tx.user.findUnique({ where: { id: data.userId }, select: { pointsBalance: true } }),
        tx.rewardCatalog.findUnique({ where: { id: data.rewardId }, select: { remainingStock: true } }),
      ]);
      return {
        outcome: 'CLAIMED' as const,
        claimed,
        balance: user?.pointsBalance ?? 0,
        remainingStock: reward?.remainingStock ?? 0,
      };
    });
  }

  public async getUserClaimedRewards(userId: string) {
    return prisma.claimedReward.findMany({
      where: { userId },
      include: {
        rewardCatalog: {
          include: { partner: true },
        },
      },
      orderBy: { claimedAt: 'desc' },
    });
  }

  public async findClaimByCode(uniqueCode: string) {
    return prisma.claimedReward.findUnique({
      where: { uniqueCode },
      include: {
        rewardCatalog: { include: { partner: true } },
        user: true,
      },
    });
  }

  public async markCodeAsUsed(id: string) {
    return prisma.claimedReward.update({
      where: { id },
      data: { isUsed: true },
    });
  }
}

export const marketplaceRepository = new MarketplaceRepository();
export default marketplaceRepository;
