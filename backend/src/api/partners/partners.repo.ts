import prisma from '../../config/prisma.config';

export class PartnersRepository {
  public async findAllPartners() {
    return prisma.partner.findMany({
      include: {
        rewards: {
          include: {
            _count: { select: { claimedRewards: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findPartnerById(id: string) {
    return prisma.partner.findUnique({
      where: { id },
      include: {
        rewards: {
          include: {
            claimedRewards: true,
          },
        },
      },
    });
  }

  public async createPartner(data: { name: string; logoUrl: string; ownerId?: string }) {
    return prisma.partner.create({
      data: {
        name: data.name,
        logoUrl: data.logoUrl,
        isActive: true,
        ...(data.ownerId ? { ownerId: data.ownerId } : {}),
      },
    });
  }

  public async createRewardOffer(data: {
    partnerId: string;
    title: string;
    costInPoints: number;
    totalStock: number;
  }) {
    return prisma.rewardCatalog.create({
      data: {
        partnerId: data.partnerId,
        title: data.title,
        costInPoints: data.costInPoints,
        totalStock: data.totalStock,
        remainingStock: data.totalStock,
        isActive: true,
      },
    });
  }

  public async findRewardById(rewardId: string) {
    return prisma.rewardCatalog.findUnique({
      where: { id: rewardId },
      include: { partner: true },
    });
  }

  public async incrementRewardStock(rewardId: string, addedStock: number) {
    return prisma.rewardCatalog.update({
      where: { id: rewardId },
      data: {
        totalStock: { increment: addedStock },
        remainingStock: { increment: addedStock },
      },
    });
  }
}

export const partnersRepository = new PartnersRepository();
export default partnersRepository;
