import { Queue } from 'bullmq';
import redis from '../config/redis.config';
import ledgerService, { LedgerActionType } from '../services/ledger.service';
import logger from '../utils/logger.util';

export interface LedgerJobData {
  userId: string;
  amount: number;
  actionType: LedgerActionType;
  description?: string;
  operation: 'CREDIT' | 'DEBIT';
}

let bullLedgerQueue: Queue<LedgerJobData> | null = null;

try {
  const rawRedis = redis.getRawClient();
  if (rawRedis) {
    bullLedgerQueue = new Queue<LedgerJobData>('ledger-queue', {
      connection: rawRedis as any,
    });
  }
} catch {
  bullLedgerQueue = null;
}

export const enqueueLedgerTransaction = async (
  data: LedgerJobData
): Promise<{ queued: boolean; jobId?: string; queuePosition?: number }> => {
  if (bullLedgerQueue) {
    try {
      const waitingCount = await bullLedgerQueue.getWaitingCount();
      const job = await bullLedgerQueue.add('ledger-op', data, {
        attempts: 3,
      });
      return {
        queued: true,
        jobId: job.id,
        queuePosition: waitingCount + 1,
      };
    } catch {}
  }

  logger.debug(`Exécution directe de la transaction Ledger (${data.operation}) pour ${data.userId}`);
  if (data.operation === 'CREDIT') {
    await ledgerService.creditPoints(data.userId, data.amount, data.actionType, data.description);
  } else {
    await ledgerService.debitPoints(data.userId, data.amount, data.actionType, data.description);
  }
  return { queued: false, queuePosition: 0 };
};

export default bullLedgerQueue;
