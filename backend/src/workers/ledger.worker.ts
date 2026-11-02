import { Worker, Job } from 'bullmq';
import redis from '../config/redis.config';
import ledgerService from '../services/ledger.service';
import { LedgerJobData } from '../queues/ledger.queue';
import logger from '../utils/logger.util';

export const startLedgerWorker = (): Worker<LedgerJobData> | null => {
  const rawRedis = redis.getRawClient();
  if (!rawRedis) return null;

  try {
    const worker = new Worker<LedgerJobData>(
      'ledger-queue',
      async (job: Job<LedgerJobData>) => {
        const { userId, amount, actionType, description, operation } = job.data;
        if (operation === 'CREDIT') {
          return ledgerService.creditPoints(userId, amount, actionType, description);
        }
        return ledgerService.debitPoints(userId, amount, actionType, description);
      },
      { connection: rawRedis as any }
    );

    worker.on('completed', (job) => {
      logger.debug(`Job Ledger #${job.id} terminé`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job Ledger #${job?.id} échoué: ${err.message}`);
    });

    return worker;
  } catch {
    return null;
  }
};
