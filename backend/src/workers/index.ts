import { Worker } from 'bullmq';
import { startEmailWorker } from './email.worker';
import { startLedgerWorker } from './ledger.worker';

export const startWorkers = (): Worker[] =>
  [startEmailWorker(), startLedgerWorker()].filter((worker): worker is Worker => worker !== null);

export const closeWorkers = async (workers: Worker[]): Promise<void> => {
  await Promise.allSettled(workers.map((worker) => worker.close()));
};
