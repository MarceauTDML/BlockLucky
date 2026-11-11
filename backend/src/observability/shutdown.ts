import prisma from '../config/prisma.config';
import redis from '../config/redis.config';
import { env } from '../config/env.config';
import bullEmailsQueue from '../queues/emails.queue';
import bullLedgerQueue from '../queues/ledger.queue';
import { closeChainActionsQueue } from '../blockchain/chain-actions';
import chainClient from '../blockchain/chain.client';
import logger from '../utils/logger.util';
import { markShuttingDown } from './lifecycle';

export interface CloseStep {
  name: string;
  close: () => Promise<unknown>;
}

let shutdownStarted = false;

export const registerShutdown = (steps: CloseStep[]): void => {
  const shutdown = async (reason: string, exitCode: number) => {
    if (shutdownStarted) return;
    shutdownStarted = true;
    markShuttingDown();
    logger.info(`Arrêt du serveur demandé (${reason})`);

    const forceExit = setTimeout(() => {
      logger.error(`Arrêt forcé après ${env.SHUTDOWN_TIMEOUT_MS} ms`);
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    const allSteps: CloseStep[] = [
      ...steps,
      {
        name: 'queues',
        close: () => Promise.all([bullEmailsQueue?.close(), bullLedgerQueue?.close(), closeChainActionsQueue()]),
      },
      { name: 'blockchain', close: async () => chainClient.destroy() },
      { name: 'prisma', close: () => prisma.$disconnect() },
      { name: 'redis', close: () => redis.close() },
    ];

    for (const step of allSteps) {
      try {
        await step.close();
        logger.debug(`Ressource fermée : ${step.name}`);
      } catch (error) {
        logger.warn(`Fermeture de ${step.name} en erreur : ${(error as Error).message}`);
      }
    }

    logger.info('Serveur arrêté proprement');
    process.exit(exitCode);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM', 0));
  process.on('SIGINT', () => void shutdown('SIGINT', 0));

  process.on('unhandledRejection', (reason) => {
    logger.error('Promesse rejetée non gérée', {
      error: reason instanceof Error ? { message: reason.message, stack: reason.stack } : reason,
    });
    if (env.NODE_ENV === 'production') void shutdown('unhandledRejection', 1);
  });

  process.on('uncaughtException', (error) => {
    logger.error(`Exception non capturée : ${error.message}`, { stack: error.stack });
    void shutdown('uncaughtException', 1);
  });
};
