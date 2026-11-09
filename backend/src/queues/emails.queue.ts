import { Queue } from 'bullmq';
import redis from '../config/redis.config';
import emailService, { EmailTemplateName } from '../services/email.service';
import logger from '../utils/logger.util';
import { defaultJobOptions } from './queue.options';

export interface EmailJobData {
  to: string;
  subject: string;
  templateName: EmailTemplateName;
  variables: Record<string, string>;
}

let bullEmailsQueue: Queue<EmailJobData> | null = null;

try {
  const rawRedis = redis.getRawClient();
  if (rawRedis) {
    bullEmailsQueue = new Queue<EmailJobData>('emails-queue', {
      connection: rawRedis as any,
      defaultJobOptions,
    });
  }
} catch {
  bullEmailsQueue = null;
}

export const enqueueEmail = async (data: EmailJobData): Promise<{ queued: boolean; jobId?: string | undefined }> => {
  if (bullEmailsQueue) {
    try {
      const job = await bullEmailsQueue.add('send-email', data);
      return { queued: true, jobId: job.id };
    } catch {}
  }
  logger.debug(`Exécution directe de l'envoi d'email [${data.templateName}] à ${data.to}`);
  await emailService.sendTemplateEmail(data.to, data.subject, data.templateName, data.variables);
  return { queued: false };
};

export default bullEmailsQueue;
