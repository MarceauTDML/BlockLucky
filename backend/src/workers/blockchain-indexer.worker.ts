import prisma from '../config/prisma.config';
import ledgerService from '../services/ledger.service';
import logger from '../utils/logger.util';

export interface IndexedTicketEvent {
  transactionHash: string;
  blockNumber: number;
  walletAddress: string;
  contractRoundId: number;
  ticketPriceEth?: number;
}

export interface IndexedDrawWinnerEvent {
  contractRoundId: number;
  winnerWallet: string;
  chainlinkRequestId?: string;
}

export class BlockchainIndexerWorker {
  public async processTicketPurchasedEvent(event: IndexedTicketEvent) {
    const walletLower = event.walletAddress.toLowerCase();

    let user = await prisma.user.findUnique({ where: { walletAddress: walletLower } });
    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress: walletLower },
      });
    }

    let round = await prisma.lotteryRound.findUnique({
      where: { contractRoundId: event.contractRoundId },
    });
    if (!round) {
      round = await prisma.lotteryRound.create({
        data: {
          contractRoundId: event.contractRoundId,
          status: 'OPEN',
          prizePool: 0,
        },
      });
    }

    const existingTicket = await prisma.ticket.findUnique({
      where: { transactionHash: event.transactionHash },
    });
    if (existingTicket) {
      logger.info(`Ticket déjà indexé (${event.transactionHash})`);
      return { ticket: existingTicket, alreadyIndexed: true };
    }

    const price = event.ticketPriceEth ?? 0.01;

    const [ticket] = await prisma.$transaction([
      prisma.ticket.create({
        data: {
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          userId: user.id,
          lotteryId: round.id,
        },
      }),
      prisma.lotteryRound.update({
        where: { id: round.id },
        data: {
          prizePool: { increment: price },
        },
      }),
    ]);

    await ledgerService.creditPoints(
      user.id,
      50,
      'TICKET_PURCHASE',
      `Achat de ticket sur le Round #${event.contractRoundId} (${event.transactionHash.slice(0, 10)}...)`
    );

    logger.info(`Événement Blockchain TicketPurchased indexé: ${event.transactionHash}`);
    return { ticket, alreadyIndexed: false };
  }

  public async processDrawWinnerEvent(event: IndexedDrawWinnerEvent) {
    const round = await prisma.lotteryRound.findUnique({
      where: { contractRoundId: event.contractRoundId },
    });

    if (!round) {
      throw new Error(`LotteryRound #${event.contractRoundId} introuvable`);
    }

    const updatedRound = await prisma.lotteryRound.update({
      where: { id: round.id },
      data: {
        status: 'COMPLETED',
        winnerWallet: event.winnerWallet.toLowerCase(),
        chainlinkRequestId: event.chainlinkRequestId ?? round.chainlinkRequestId,
        drawnAt: new Date(),
      },
    });

    logger.info(
      `Événement Blockchain WinnerPicked indexé: Round #${event.contractRoundId} -> ${event.winnerWallet}`
    );
    return updatedRound;
  }
}

export const blockchainIndexerWorker = new BlockchainIndexerWorker();
export default blockchainIndexerWorker;
