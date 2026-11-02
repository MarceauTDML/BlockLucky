import prisma from '../../config/prisma.config';

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
