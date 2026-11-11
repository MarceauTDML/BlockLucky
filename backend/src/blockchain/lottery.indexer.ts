import { Interface, Log, LogDescription, TransactionReceipt, formatEther } from 'ethers';
import prisma from '../config/prisma.config';
import { env } from '../config/env.config';
import ledgerService from '../services/ledger.service';
import { emitSocketEvent } from '../socket/event-bridge';
import { businessEventsTotal } from '../observability/metrics';
import logger from '../utils/logger.util';
import chainClient from './chain.client';
import { enqueueChainAction } from './chain-actions';
import lotteryAbi from './abi/BlockLucky.json';

const CURSOR_ID = 'BlockLucky';
const MAX_BLOCK_RANGE = 2000;
export const POINTS_PER_TICKET = 50;
export const POINTS_PER_GIFTED_TICKET = 75;

const lotteryInterface = new Interface(lotteryAbi);

const parseLotteryLog = (log: Log): LogDescription | null => {
  try {
    return lotteryInterface.parseLog({ topics: [...log.topics], data: log.data });
  } catch {
    return null;
  }
};

const isUniqueViolation = (error: unknown): boolean => {
  const candidate = error as { code?: string; meta?: { driverAdapterError?: { cause?: { originalCode?: string } } } };
  return candidate.code === 'P2002' || candidate.meta?.driverAdapterError?.cause?.originalCode === '23505';
};
const roundStatuses = ['OPEN', 'LOCKED', 'COMPLETED', 'CANCELLED'] as const;

export interface IndexedPurchase {
  contractRoundId: number;
  roundId: string;
  player: string;
  payer: string;
  quantity: number;
  ticketIds: string[];
  created: boolean;
  pointsAwarded: number;
}

export class LotteryIndexer {
  private blockTimes = new Map<number, Date>();
  private syncing = false;
  private cursorAheadReported = false;

  private async blockTime(blockNumber: number): Promise<Date> {
    const cached = this.blockTimes.get(blockNumber);
    if (cached) return cached;
    const block = await chainClient.provider.getBlock(blockNumber);
    const date = block ? new Date(block.timestamp * 1000) : new Date();
    if (this.blockTimes.size > 500) this.blockTimes.clear();
    this.blockTimes.set(blockNumber, date);
    return date;
  }

  private async ensureRound(contractRoundId: number, blockNumber: number) {
    const existing = await prisma.lotteryRound.findUnique({ where: { contractRoundId } });
    if (existing) return existing;
    const onchain = await chainClient.lottery().getFunction('getRound')(contractRoundId);
    return prisma.lotteryRound.upsert({
      where: { contractRoundId },
      update: {},
      create: {
        contractRoundId,
        status: roundStatuses[Number(onchain.status)] ?? 'OPEN',
        prizePool: Number(formatEther(onchain.totalCollected)),
        ticketPriceWei: onchain.ticketPrice.toString(),
        startedAt: onchain.startTime > 0n ? new Date(Number(onchain.startTime) * 1000) : await this.blockTime(blockNumber),
        endsAt: onchain.endTime > 0n ? new Date(Number(onchain.endTime) * 1000) : null,
      },
    });
  }

  private async userForWallet(walletAddress: string) {
    const address = walletAddress.toLowerCase();
    return (
      (await prisma.user.findUnique({ where: { walletAddress: address } })) ??
      prisma.user.create({ data: { walletAddress: address } })
    );
  }

  private async onRoundOpened(event: LogDescription, log: Log) {
    const contractRoundId = Number(event.args.roundId);
    const startedAt = await this.blockTime(log.blockNumber);
    await prisma.lotteryRound.upsert({
      where: { contractRoundId },
      update: {
        ticketPriceWei: event.args.ticketPrice.toString(),
        endsAt: new Date(Number(event.args.endTime) * 1000),
      },
      create: {
        contractRoundId,
        status: 'OPEN',
        prizePool: 0,
        ticketPriceWei: event.args.ticketPrice.toString(),
        startedAt,
        endsAt: new Date(Number(event.args.endTime) * 1000),
      },
    });
  }

  private async onTicketsPurchased(event: LogDescription, log: Log): Promise<IndexedPurchase> {
    const contractRoundId = Number(event.args.roundId);
    const quantity = Number(event.args.quantity);
    const firstTicketIndex = Number(event.args.firstTicketIndex);
    const player = (event.args.player as string).toLowerCase();
    const payer = (event.args.payer as string).toLowerCase();
    const round = await this.ensureRound(contractRoundId, log.blockNumber);
    const owner = await this.userForWallet(player);

    const indexes = Array.from({ length: quantity }, (_, offset) => firstTicketIndex + offset);
    const alreadyIndexed = async (): Promise<IndexedPurchase> => {
      const rows = await prisma.ticket.findMany({
        where: { lotteryId: round.id, ticketIndex: { in: indexes } },
        select: { id: true },
      });
      return {
        contractRoundId,
        roundId: round.id,
        player,
        payer,
        quantity,
        ticketIds: rows.map((t) => t.id),
        created: false,
        pointsAwarded: 0,
      };
    };

    const existingCount = await prisma.ticket.count({
      where: { lotteryId: round.id, ticketIndex: { in: indexes } },
    });
    if (existingCount > 0) return alreadyIndexed();

    const purchasedAt = await this.blockTime(log.blockNumber);
    let tickets: Array<{ id: string }>;
    try {
      const results = await prisma.$transaction([
        ...indexes.map((ticketIndex) =>
          prisma.ticket.create({
            data: {
              userId: owner.id,
              lotteryId: round.id,
              ticketIndex,
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
              payerWallet: payer,
              purchasedAt,
            },
          })
        ),
        prisma.lotteryRound.update({
          where: { id: round.id },
          data: { prizePool: { increment: Number(formatEther(event.args.amount)) } },
        }),
      ]);
      tickets = results.slice(0, quantity) as Array<{ id: string }>;
    } catch (error) {
      if (isUniqueViolation(error)) return alreadyIndexed();
      throw error;
    }

    const pointsAwarded = POINTS_PER_TICKET * quantity;
    await ledgerService.creditPoints(
      owner.id,
      pointsAwarded,
      'TICKET_PURCHASE',
      `Achat de ${quantity} ticket(s) sur le tour #${contractRoundId}`
    );
    if (payer !== player) {
      const giver = await prisma.user.findUnique({ where: { walletAddress: payer } });
      if (giver) {
        await ledgerService.creditPoints(
          giver.id,
          POINTS_PER_GIFTED_TICKET * quantity,
          'GIFT_TICKET',
          `${quantity} ticket(s) offert(s) sur le tour #${contractRoundId}`
        );
      }
    }

    emitSocketEvent('points:awarded', { userId: owner.id, amount: pointsAwarded, reason: 'TICKET_PURCHASE' });
    businessEventsTotal.inc({ event: 'ticket_indexed' }, quantity);
    await enqueueChainAction({ type: 'MINT_BADGE', contractRoundId, walletAddress: player });

    return {
      contractRoundId,
      roundId: round.id,
      player,
      payer,
      quantity,
      ticketIds: tickets.map((t) => t.id),
      created: true,
      pointsAwarded,
    };
  }

  private async onDrawRequested(event: LogDescription, log: Log) {
    const contractRoundId = Number(event.args.roundId);
    await this.ensureRound(contractRoundId, log.blockNumber);
    await prisma.lotteryRound.update({
      where: { contractRoundId },
      data: {
        status: 'LOCKED',
        chainlinkRequestId: event.args.requestId.toString(),
        drawRequestedAt: await this.blockTime(log.blockNumber),
      },
    });
  }

  private async onWinnerPicked(event: LogDescription, log: Log) {
    const contractRoundId = Number(event.args.roundId);
    const winner = (event.args.winner as string).toLowerCase();
    await this.ensureRound(contractRoundId, log.blockNumber);
    const round = await prisma.lotteryRound.update({
      where: { contractRoundId },
      data: {
        status: 'COMPLETED',
        winnerWallet: winner,
        winningTicket: Number(event.args.winningTicket),
        prizeWei: event.args.prize.toString(),
        chainlinkRequestId: event.args.requestId.toString(),
        drawnAt: await this.blockTime(log.blockNumber),
      },
    });

    emitSocketEvent('draw:winner', {
      roundId: round.id,
      contractRoundId,
      winnerWallet: winner,
      prizePool: Number(formatEther(event.args.prize)),
      vrfProofHash: log.transactionHash,
      timestamp: new Date().toISOString(),
    });
    await enqueueChainAction({ type: 'CLAIM_PRIZE', contractRoundId, walletAddress: winner });
  }

  private async onPrizeClaimed(event: LogDescription, log: Log) {
    await prisma.lotteryRound.updateMany({
      where: { contractRoundId: Number(event.args.roundId) },
      data: { prizeClaimedAt: await this.blockTime(log.blockNumber) },
    });
  }

  private async onRoundCancelled(event: LogDescription, log: Log) {
    const contractRoundId = Number(event.args.roundId);
    const round = await this.ensureRound(contractRoundId, log.blockNumber);
    await prisma.lotteryRound.update({ where: { id: round.id }, data: { status: 'CANCELLED' } });

    const payers = await prisma.ticket.findMany({
      where: { lotteryId: round.id, payerWallet: { not: null } },
      select: { payerWallet: true },
      distinct: ['payerWallet'],
    });
    for (const { payerWallet } of payers) {
      if (payerWallet) await enqueueChainAction({ type: 'CLAIM_REFUND', contractRoundId, walletAddress: payerWallet });
    }
  }

  public async processLogs(logs: ReadonlyArray<Log>): Promise<IndexedPurchase[]> {
    const purchases: IndexedPurchase[] = [];
    const ordered = [...logs]
      .filter((log) => log.address.toLowerCase() === env.LOTTERY_CONTRACT_ADDRESS.toLowerCase())
      .sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);

    for (const log of ordered) {
      const event = parseLotteryLog(log);
      if (!event) continue;

      switch (event.name) {
        case 'RoundOpened':
          await this.onRoundOpened(event, log);
          break;
        case 'TicketsPurchased':
          purchases.push(await this.onTicketsPurchased(event, log));
          break;
        case 'DrawRequested':
          await this.onDrawRequested(event, log);
          break;
        case 'WinnerPicked':
          await this.onWinnerPicked(event, log);
          break;
        case 'PrizeClaimed':
          await this.onPrizeClaimed(event, log);
          break;
        case 'RoundCancelled':
          await this.onRoundCancelled(event, log);
          break;
        default:
          break;
      }
    }
    return purchases;
  }

  public async processReceipt(receipt: TransactionReceipt): Promise<IndexedPurchase[]> {
    return this.processLogs(receipt.logs);
  }

  public async syncOnce(): Promise<number> {
    if (this.syncing || !chainClient.isOnchain) return 0;
    this.syncing = true;
    try {
      const cursor = await prisma.chainCursor.findUnique({ where: { id: CURSOR_ID } });
      const fromBlock = cursor ? cursor.lastBlock + 1 : env.CHAIN_START_BLOCK;
      const head = (await chainClient.provider.getBlockNumber()) - env.CHAIN_CONFIRMATIONS;
      if (head < fromBlock) {
        if (cursor && head + env.CHAIN_CONFIRMATIONS < cursor.lastBlock && !this.cursorAheadReported) {
          this.cursorAheadReported = true;
          logger.error(
            `Le curseur d'indexation (bloc ${cursor.lastBlock}) dépasse la tête de chaîne (bloc ${head}). La chaîne a été réinitialisée : réinitialisez aussi la base de données.`
          );
        }
        return 0;
      }
      this.cursorAheadReported = false;
      const toBlock = Math.min(head, fromBlock + MAX_BLOCK_RANGE - 1);

      const logs = await chainClient.provider.getLogs({
        address: env.LOTTERY_CONTRACT_ADDRESS,
        fromBlock,
        toBlock,
      });
      await this.processLogs(logs);
      await prisma.chainCursor.upsert({
        where: { id: CURSOR_ID },
        update: { lastBlock: toBlock },
        create: { id: CURSOR_ID, lastBlock: toBlock },
      });
      return logs.length;
    } catch (error) {
      logger.warn(`Indexation blockchain interrompue : ${(error as Error).message}`);
      return 0;
    } finally {
      this.syncing = false;
    }
  }
}

export const lotteryIndexer = new LotteryIndexer();
export default lotteryIndexer;
