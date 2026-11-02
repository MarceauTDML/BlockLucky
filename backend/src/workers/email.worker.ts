import { Worker, Job } from 'bullmq';
import redis from '../config/redis.config';
import emailService from '../services/email.service';
import { EmailJobData } from '../queues/emails.queue';
import logger from '../utils/logger.util';

export const startEmailWorker = (): Worker<EmailJobData> | null => {
  const rawRedis = redis.getRawClient();
  if (!rawRedis) return null;

  try {
    const worker = new Worker<EmailJobData>(
      'emails-queue',
      async (job: Job<EmailJobData>) => {
        const { to, subject, templateName, variables } = job.data;
        await emailService.sendTemplateEmail(to, subject, templateName, variables);
      },
      { connection: rawRedis as any }
    );

    worker.on('completed', (job) => {
      logger.debug(`Job Email #${job.id} terminé`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job Email #${job?.id} échoué: ${err.message}`);
    });

    return worker;
  } catch {
    return null;
  }
};
