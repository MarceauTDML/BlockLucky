import { Worker, Job, UnrecoverableError } from 'bullmq';
import redis from '../config/redis.config';
import { env } from '../config/env.config';
import emailService from '../services/email.service';
import { EmailJobData } from '../queues/emails.queue';
import { queueJobsTotal } from '../observability/metrics';
import logger from '../utils/logger.util';

export const startEmailWorker = (): Worker<EmailJobData> | null => {
  const rawRedis = redis.getRawClient();
  if (!rawRedis) return null;

  try {
    const worker = new Worker<EmailJobData>(
      'emails-queue',
      async (job: Job<EmailJobData>) => {
        const { to, subject, templateName, variables } = job.data;
        if (!to || !templateName) {
          throw new UnrecoverableError('Job email incomplet (destinataire ou template manquant)');
        }
        await emailService.sendTemplateEmail(to, subject, templateName, variables);
      },
      { connection: rawRedis as any, concurrency: env.WORKER_CONCURRENCY }
    );

    worker.on('completed', (job) => {
      queueJobsTotal.inc({ queue: 'emails-queue', status: 'completed' });
      logger.debug(`Job Email #${job.id} terminé`);
    });

    worker.on('failed', (job, err) => {
      queueJobsTotal.inc({ queue: 'emails-queue', status: 'failed' });
      logger.error(`Job Email #${job?.id} échoué: ${err.message}`, {
        attemptsMade: job?.attemptsMade,
      });
    });

    worker.on('error', () => {});

    return worker;
  } catch {
    return null;
  }
};
