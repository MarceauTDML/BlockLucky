import redis from '../config/redis.config';
import { env } from '../config/env.config';
import logger from '../utils/logger.util';
import chainClient from './chain.client';
import { decodeContractError } from './chain-actions';
import lotteryIndexer from './lottery.indexer';
import { markDrawReady, readyCandidate, revealAtFrom } from './draw-reveal';

const LOCK_KEY = 'chain:keeper-lock';
const LOCAL_CHAIN_ID = 31337;
const LOCAL_CLOCK_TOLERANCE_SECONDS = 5;

export const syncLocalChainClock = async (): Promise<boolean> => {
  if (env.CHAIN_ID !== LOCAL_CHAIN_ID || chainClient.isUsingFallback) return false;
  try {
    const latest = await chainClient.provider.getBlock('latest');
    if (!latest) return false;
    const now = Math.floor(Date.now() / 1000);
    if (now - latest.timestamp <= LOCAL_CLOCK_TOLERANCE_SECONDS) return false;
    await chainClient.provider.send('evm_mine', []);
    return true;
  } catch (error) {
    logger.warn(`Horloge de la blockchain locale non avancée : ${(error as Error).message}`);
    return false;
  }
};

export type KeeperAction = 'draw-requested' | 'round-closed' | 'waiting-room' | 'idle';

export const runKeeperOnce = async (): Promise<KeeperAction> => {
  if (!chainClient.isOnchain) return 'idle';
  const lockTtl = Math.max(5, Math.ceil(env.KEEPER_INTERVAL_MS / 1000));
  if (!(await redis.setIfAbsent(LOCK_KEY, '1', lockTtl))) return 'idle';

  try {
    await syncLocalChainClock();
    const lottery = chainClient.lottery(chainClient.operator);
    if (await lottery.getFunction('paused')()) return 'idle';

    if (await lottery.getFunction('isDrawReady')()) {
      const roundId = Number(await lottery.getFunction('currentRoundId')());
      const round = await lottery.getFunction('getRound')(roundId);
      const endTime = new Date(Number(round.endTime) * 1000);
      const readyAt = await markDrawReady(roundId, readyCandidate(endTime));
      if (Date.now() < revealAtFrom(readyAt)) return 'waiting-room';

      const tx = await lottery.getFunction('requestDraw')();
      const receipt = await tx.wait();
      if (receipt) await lotteryIndexer.processReceipt(receipt);
      logger.info('Tirage demandé automatiquement à Chainlink VRF', { txHash: tx.hash });
      return 'draw-requested';
    }

    if (await lottery.getFunction('isExpiredWithoutDraw')()) {
      const tx = await lottery.getFunction('closeExpiredRound')();
      const receipt = await tx.wait();
      if (receipt) await lotteryIndexer.processReceipt(receipt);
      logger.info('Tour expiré sans assez de participants : annulation et remboursements', { txHash: tx.hash });
      return 'round-closed';
    }
    return 'idle';
  } catch (error) {
    const reason = decodeContractError(error);
    if (reason !== 'DrawNotReady' && reason !== 'RoundNotCancellable') {
      logger.warn(`Automate du tirage : ${reason ?? (error as Error).message}`);
    }
    return 'idle';
  } finally {
    await redis.del(LOCK_KEY);
  }
};

export interface ChainServices {
  stop: () => Promise<void>;
}

export const startChainServices = (): ChainServices | null => {
  if (!chainClient.isOnchain) return null;

  let running = true;
  const indexerTimer = setInterval(() => {
    if (running) void lotteryIndexer.syncOnce();
  }, env.INDEXER_INTERVAL_MS);
  const keeperTimer = setInterval(() => {
    if (running) void runKeeperOnce();
  }, env.KEEPER_INTERVAL_MS);
  void lotteryIndexer.syncOnce();

  logger.info('Indexation blockchain et automate du tirage démarrés');

  return {
    stop: async () => {
      running = false;
      clearInterval(indexerTimer);
      clearInterval(keeperTimer);
    },
  };
};
