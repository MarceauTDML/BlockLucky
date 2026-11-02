import prisma from '../../config/prisma.config';

export class AnalyticsRepository {
  public async createEvent(data: {
    userId?: string;
    eventType: string;
    utmSource?: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.analytics.create({
      data: {
        ...(data.userId ? { userId: data.userId } : {}),
        eventType: data.eventType,
        utmSource: data.utmSource ?? 'direct',
        metadata: (data.metadata ?? {}) as any,
      },
    });
  }

  public async getUtmBreakdown() {
    const grouped = await prisma.analytics.groupBy({
      by: ['utmSource'],
      _count: { id: true },
    });
    return grouped;
  }

  public async getRecentAnalytics(limit = 500) {
    return prisma.analytics.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  public async getGlobalCounts() {
    const [totalUsers, totalTickets, totalClaimedRewards, rounds] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.ticket.count(),
      prisma.claimedReward.count(),
      prisma.lotteryRound.findMany(),
    ]);
    return { totalUsers, totalTickets, totalClaimedRewards, rounds };
  }
}

export const analyticsRepository = new AnalyticsRepository();
export default analyticsRepository;
