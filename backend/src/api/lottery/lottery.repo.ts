import prisma from '../../config/prisma.config';
import { Status } from '@prisma/client';

export class LotteryRepository {
  public async getCurrentOrCreateRound() {
    let round = await prisma.lotteryRound.findFirst({
      where: { status: { in: ['OPEN', 'LOCKED'] } },
      orderBy: { contractRoundId: 'desc' },
      include: {
        _count: { select: { tickets: true } },
      },
    });

    if (!round) {
      const latest = await prisma.lotteryRound.findFirst({
        orderBy: { contractRoundId: 'desc' },
      });
      const nextRoundId = latest ? latest.contractRoundId + 1 : 1;

      round = await prisma.lotteryRound.create({
        data: {
          contractRoundId: nextRoundId,
          status: 'OPEN',
          prizePool: 0.0,
        },
        include: {
          _count: { select: { tickets: true } },
        },
      });
    }

    return round;
  }

  public async upsertRoundFromChain(data: {
    contractRoundId: number;
    status: Status;
    prizePool: number;
    ticketPriceWei: string;
    startedAt: Date;
    endsAt: Date;
    winnerWallet: string | null;
  }) {
    return prisma.lotteryRound.upsert({
      where: { contractRoundId: data.contractRoundId },
      update: {
        status: data.status,
        prizePool: data.prizePool,
        ticketPriceWei: data.ticketPriceWei,
        endsAt: data.endsAt,
        winnerWallet: data.winnerWallet,
      },
      create: data,
      include: { _count: { select: { tickets: true } } },
    });
  }

  public async findTicketsByIds(ids: string[]) {
    return prisma.ticket.findMany({ where: { id: { in: ids } }, orderBy: { ticketIndex: 'asc' } });
  }

  public async findRoundByContractId(contractRoundId: number) {
    return prisma.lotteryRound.findUnique({ where: { contractRoundId } });
  }

  public async findRoundById(id: string) {
    return prisma.lotteryRound.findUnique({
      where: { id },
      include: {
        tickets: {
          include: { user: true },
        },
        _count: { select: { tickets: true } },
      },
    });
  }

  public async countDistinctParticipants(lotteryId: string): Promise<number> {
    const grouped = await prisma.ticket.groupBy({
      by: ['userId'],
      where: { lotteryId },
    });
    return grouped.length;
  }

  public async countUserTicketsInRound(userId: string, lotteryId: string): Promise<number> {
    return prisma.ticket.count({
      where: { userId, lotteryId },
    });
  }

  public async createTicketWithPrizeIncrement(data: {
    userId: string;
    lotteryId: string;
    transactionHash: string;
    blockNumber: number;
    ticketPriceEth: number;
  }) {
    const [ticket, updatedRound] = await prisma.$transaction([
      prisma.ticket.create({
        data: {
          userId: data.userId,
          lotteryId: data.lotteryId,
          transactionHash: data.transactionHash,
          blockNumber: data.blockNumber,
        },
      }),
      prisma.lotteryRound.update({
        where: { id: data.lotteryId },
        data: {
          prizePool: { increment: data.ticketPriceEth },
        },
      }),
    ]);

    return { ticket, updatedRound };
  }

  public async getUserTickets(userId: string, skip = 0, limit = 20) {
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: { userId },
        include: { lottery: true },
        orderBy: { purchasedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ticket.count({ where: { userId } }),
    ]);

    return { tickets, total };
  }

  public async updateRoundStatus(
    roundId: string,
    data: {
      status: Status;
      winnerWallet?: string | null;
      chainlinkRequestId?: string | null;
      drawnAt?: Date | null;
    }
  ) {
    return prisma.lotteryRound.update({
      where: { id: roundId },
      data,
    });
  }

  public async getLeaderboardData(limit = 20) {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        walletAddress: true,
        pointsBalance: true,
        _count: {
          select: {
            referrals: true,
            tickets: true,
          },
        },
      },
      orderBy: { pointsBalance: 'desc' },
      take: limit,
    });
    return users;
  }
}

export const lotteryRepository = new LotteryRepository();
export default lotteryRepository;
