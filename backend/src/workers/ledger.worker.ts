import { Worker, Job, UnrecoverableError } from 'bullmq';
import redis from '../config/redis.config';
import ledgerService from '../services/ledger.service';
import { LedgerJobData } from '../queues/ledger.queue';
import { queueJobsTotal } from '../observability/metrics';
import { AppError } from '../utils/response.util';
import logger from '../utils/logger.util';

export const startLedgerWorker = (): Worker<LedgerJobData> | null => {
  const rawRedis = redis.getRawClient();
  if (!rawRedis) return null;

  try {
    const worker = new Worker<LedgerJobData>(
      'ledger-queue',
      async (job: Job<LedgerJobData>) => {
        const { userId, amount, actionType, description, operation } = job.data;
        try {
          if (operation === 'CREDIT') {
            return await ledgerService.creditPoints(userId, amount, actionType, description);
          }
          return await ledgerService.debitPoints(userId, amount, actionType, description);
        } catch (error) {
          if (error instanceof AppError && error.statusCode < 500) {
            throw new UnrecoverableError(error.message);
          }
          throw error;
        }
      },
      { connection: rawRedis as any, concurrency: 1 }
    );

    worker.on('completed', (job) => {
      queueJobsTotal.inc({ queue: 'ledger-queue', status: 'completed' });
      logger.debug(`Job Ledger #${job.id} terminé`);
    });

    worker.on('failed', (job, err) => {
      queueJobsTotal.inc({ queue: 'ledger-queue', status: 'failed' });
      logger.error(`Job Ledger #${job?.id} échoué: ${err.message}`, {
        attemptsMade: job?.attemptsMade,
      });
    });

    worker.on('error', () => {});

    return worker;
  } catch {
    return null;
  }
};
