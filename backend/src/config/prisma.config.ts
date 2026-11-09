import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env.config';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
  lock_timeout: 5000,
  idle_in_transaction_session_timeout: 60000,
  application_name: 'blocklucky-backend',
});

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: env.DB_LOG_QUERIES ? ['query', 'error', 'warn'] : ['error', 'warn'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
