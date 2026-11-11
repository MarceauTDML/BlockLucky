import { Job, Queue, UnrecoverableError, Worker } from 'bullmq';
import { Interface } from 'ethers';
import prisma from '../config/prisma.config';
import redis from '../config/redis.config';
import { defaultJobOptions } from '../queues/queue.options';
import { queueJobsTotal } from '../observability/metrics';
import logger from '../utils/logger.util';
import chainClient from './chain.client';
import walletService from './wallet.service';
import lotteryAbi from './abi/BlockLucky.json';
import poapAbi from './abi/BlockLuckyPOAP.json';

export type ChainActionJob =
  | { type: 'CLAIM_PRIZE'; contractRoundId: number; walletAddress: string }
  | { type: 'CLAIM_REFUND'; contractRoundId: number; walletAddress: string }
  | { type: 'MINT_BADGE'; contractRoundId: number; walletAddress: string };

const QUEUE_NAME = 'chain-actions';
const ALREADY_DONE_ERRORS = new Set(['PrizeAlreadyClaimed', 'NothingToRefund', 'BadgeAlreadyMinted']);
const PERMANENT_ERRORS = new Set(['NotWinner', 'RoundNotCompleted', 'RoundNotCancelled', 'ZeroAddressNotAllowed']);
const errorInterfaces = [new Interface(lotteryAbi), new Interface(poapAbi)];

export const decodeContractError = (error: unknown): string | null => {
  const data =
    (error as { data?: string })?.data ??
    (error as { info?: { error?: { data?: string } } })?.info?.error?.data ??
    (error as { error?: { data?: string } })?.error?.data;
  if (typeof data !== 'string' || data.length < 10) return null;
  for (const iface of errorInterfaces) {
    try {
      const parsed = iface.parseError(data);
      if (parsed) return parsed.name;
    } catch {
      continue;
    }
  }
  return null;
};

const findCustodialUser = (walletAddress: string) =>
  prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
    select: { id: true, walletAddress: true, walletEncryptedKey: true },
  });

export const executeChainAction = async (job: ChainActionJob): Promise<string | null> => {
  if (!chainClient.isOnchain) return null;

  try {
    if (job.type === 'MINT_BADGE') {
      const tx = await chainClient.poap(chainClient.operator).getFunction('mintBadge')(job.walletAddress, job.contractRoundId);
      await tx.wait();
      return tx.hash as string;
    }

    const user = await findCustodialUser(job.walletAddress);
    if (!user?.walletEncryptedKey) return null;
    const lottery = chainClient.lottery(walletService.signerFor(user));
    const tx =
      job.type === 'CLAIM_PRIZE'
        ? await lottery.getFunction('claimPrize')(job.contractRoundId)
        : await lottery.getFunction('claimRefund')(job.contractRoundId);
    await tx.wait();
    logger.info(`Action ${job.type} exécutée pour le tour #${job.contractRoundId}`, { txHash: tx.hash });
    return tx.hash as string;
  } catch (error) {
    const reason = decodeContractError(error);
    if (reason && ALREADY_DONE_ERRORS.has(reason)) return null;
    if (reason && PERMANENT_ERRORS.has(reason)) throw new UnrecoverableError(reason);
    throw error;
  }
};

let queue: Queue<ChainActionJob> | null = null;

const getQueue = (): Queue<ChainActionJob> | null => {
  if (queue) return queue;
  const connection = redis.getRawClient();
  if (!connection) return null;
  queue = new Queue<ChainActionJob>(QUEUE_NAME, { connection: connection as any, defaultJobOptions });
  return queue;
};

export const enqueueChainAction = async (job: ChainActionJob): Promise<void> => {
  if (!chainClient.isOnchain) return;
  const jobId = `${job.type}-${job.contractRoundId}-${job.walletAddress.toLowerCase()}`;
  const target = getQueue();
  if (target) {
    try {
      await target.add(job.type, job, { jobId });
      return;
    } catch {}
  }
  executeChainAction(job).catch((error: Error) =>
    logger.error(`Action ${job.type} en échec pour le tour #${job.contractRoundId}`, { reason: error.message })
  );
};

export const startChainActionsWorker = (): Worker<ChainActionJob> | null => {
  const connection = redis.getRawClient();
  if (!connection || !chainClient.isOnchain) return null;

  const worker = new Worker<ChainActionJob>(
    QUEUE_NAME,
    async (job: Job<ChainActionJob>) => executeChainAction(job.data),
    { connection: connection as any, concurrency: 1 }
  );
  worker.on('completed', () => queueJobsTotal.inc({ queue: QUEUE_NAME, status: 'completed' }));
  worker.on('failed', (job, err) => {
    queueJobsTotal.inc({ queue: QUEUE_NAME, status: 'failed' });
    logger.error(`Action blockchain ${job?.name} échouée`, { reason: err.message, attemptsMade: job?.attemptsMade });
  });
  worker.on('error', () => {});
  return worker;
};

export const closeChainActionsQueue = async (): Promise<void> => {
  if (queue) await queue.close();
  queue = null;
};
