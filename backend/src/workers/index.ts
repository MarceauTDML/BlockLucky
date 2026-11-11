import { Worker } from 'bullmq';
import { startEmailWorker } from './email.worker';
import { startLedgerWorker } from './ledger.worker';
import { startChainActionsWorker } from '../blockchain/chain-actions';

export const startWorkers = (): Worker[] =>
  [startEmailWorker(), startLedgerWorker(), startChainActionsWorker()].filter(
    (worker): worker is Worker => worker !== null
  );

export const closeWorkers = async (workers: Worker[]): Promise<void> => {
  await Promise.allSettled(workers.map((worker) => worker.close()));
};
