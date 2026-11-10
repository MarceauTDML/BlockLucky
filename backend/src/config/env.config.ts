import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true } as any);

const DEV_DEFAULTS = {
  JWT_SECRET: 'etherbay-super-secret-jwt-key-2026',
  ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  RELAYER_PRIVATE_KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  WEBHOOK_SECRET: 'etherbay-webhook-secret',
} as const;

const booleanFromEnv = (defaultValue: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .default(defaultValue ? 'true' : 'false')
    .transform((value) => value === 'true' || value === '1');

const csvList = (defaultValue: string) =>
  z
    .string()
    .default(defaultValue)
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    );

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(2053),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    APP_VERSION: z.string().default(process.env.npm_package_version ?? '1.0.0'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).optional(),
    DATABASE_URL: z
      .string()
      .url()
      .default(
        'postgresql://etherbay_admin:etherbay_password@localhost:5434/blocklucky_db?schema=public'
      ),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    DB_LOG_QUERIES: booleanFromEnv(false),
    REDIS_URL: z.string().url().default('redis://localhost:6380'),
    REDIS_KEY_PREFIX: z.string().default('blocklucky'),
    JWT_SECRET: z.string().min(16).default(DEV_DEFAULTS.JWT_SECRET),
    JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('12h'),
    ENCRYPTION_KEY: z
      .string()
      .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY doit contenir 64 caractères hexadécimaux')
      .default(DEV_DEFAULTS.ENCRYPTION_KEY),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    SMTP_FROM: z.string().default('EtherBay Lottery <noreply@etherbay.fr>'),
    RPC_URL: z.string().url().default('http://127.0.0.1:8545'),
    FALLBACK_RPC_URL: z.string().url().default('https://rpc.sepolia.org'),
    LOTTERY_CONTRACT_ADDRESS: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/)
      .default('0x5FbDB2315678afecb367f032d93F642f64180aa3'),
    POAP_CONTRACT_ADDRESS: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/)
      .default('0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'),
    RELAYER_PRIVATE_KEY: z
      .string()
      .regex(/^0x[0-9a-fA-F]{64}$/)
      .default(DEV_DEFAULTS.RELAYER_PRIVATE_KEY),
    WEBHOOK_SECRET: z.string().min(8).default(DEV_DEFAULTS.WEBHOOK_SECRET),
    AWS_REGION: z.string().default('eu-west-3'),
    AWS_ACCESS_KEY_ID: z.string().default('minioadmin'),
    AWS_SECRET_ACCESS_KEY: z.string().default('minioadmin'),
    AWS_S3_BUCKET: z.string().default('blocklucky-assets'),
    AWS_S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
    CORS_ORIGINS: csvList('http://localhost:3000,http://localhost:8081'),
    TRUST_PROXY: z.string().default('false'),
    HTTP_KEEP_ALIVE_TIMEOUT_MS: z.coerce.number().int().positive().default(65000),
    HTTP_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(25000),
    RUN_WORKERS: booleanFromEnv(true),
    WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
    METRICS_ENABLED: booleanFromEnv(true),
    METRICS_TOKEN: z.string().default(''),
    MOBILE_MIN_VERSION: z.string().default('1.0.0'),
    MAINTENANCE_MODE: booleanFromEnv(false),
    LOGIN_EMAIL_CODE_REQUIRED: booleanFromEnv(true),
    ADMIN_MFA_REQUIRED: booleanFromEnv(true),
  })
  .superRefine((values, ctx) => {
    if (values.NODE_ENV !== 'production') return;
    (['LOGIN_EMAIL_CODE_REQUIRED', 'ADMIN_MFA_REQUIRED'] as const).forEach((key) => {
      if (!values[key]) {
        ctx.addIssue({ code: 'custom', path: [key], message: `${key} ne peut pas être désactivé en production` });
      }
    });
    (Object.keys(DEV_DEFAULTS) as Array<keyof typeof DEV_DEFAULTS>).forEach((key) => {
      if (values[key] === DEV_DEFAULTS[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} utilise la valeur de développement, interdite en production`,
        });
      }
    });
  });

export type Env = z.infer<typeof envSchema>;

const loadEnv = (): Env => {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || 'env'} : ${issue.message}`)
    .join('\n');
  process.stderr.write(`Configuration invalide, démarrage interrompu :\n${details}\n`);
  process.exit(1);
};

export const env = loadEnv();

export const corsOrigins = Array.from(new Set([env.FRONTEND_URL, ...env.CORS_ORIGINS]));

export const trustProxy = ((): boolean | number | string => {
  if (env.TRUST_PROXY === 'true') return true;
  if (env.TRUST_PROXY === 'false') return false;
  const hops = Number(env.TRUST_PROXY);
  return Number.isInteger(hops) ? hops : env.TRUST_PROXY;
})();
