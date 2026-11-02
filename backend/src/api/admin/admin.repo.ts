import prisma from '../../config/prisma.config';

export class AdminRepository {
  public async getGlobalOverview() {
    const [
      usersCount,
      partnersCount,
      ticketsCount,
      claimedRewardsCount,
      rounds,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.partner.count(),
      prisma.ticket.count(),
      prisma.claimedReward.count(),
      prisma.lotteryRound.findMany({ orderBy: { contractRoundId: 'desc' } }),
    ]);

    return {
      usersCount,
      partnersCount,
      ticketsCount,
      claimedRewardsCount,
      rounds,
    };
  }

  public async recordAdminAuditLog(data: {
    adminId: string;
    action: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.analytics.create({
      data: {
        userId: data.adminId,
        eventType: `ADMIN_AUDIT:${data.action}`,
        utmSource: 'admin-dashboard',
        metadata: (data.metadata ?? {}) as any,
      },
    });
  }

  public async getAdminAuditLogs(limit = 100) {
    return prisma.analytics.findMany({
      where: {
        eventType: { startsWith: 'ADMIN_AUDIT:' },
      },
      include: {
        user: {
          select: {
            id: true,
            walletAddress: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  public async setPartnerStatus(partnerId: string, isActive: boolean) {
    return prisma.partner.update({
      where: { id: partnerId },
      data: { isActive },
    });
  }
}

export const adminRepository = new AdminRepository();
export default adminRepository;
