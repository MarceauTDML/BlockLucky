import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true } as any);

const envSchema = z.object({
  PORT: z.coerce.number().default(2053),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z
    .string()
    .default(
      'postgresql://etherbay_admin:etherbay_password@localhost:5434/blocklucky_db?schema=public'
    ),
  REDIS_URL: z.string().default('redis://localhost:6380'),
  JWT_SECRET: z.string().default('etherbay-super-secret-jwt-key-2026'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z
    .string()
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('EtherBay Lottery <noreply@etherbay.fr>'),
  RPC_URL: z.string().default('http://127.0.0.1:8545'),
  FALLBACK_RPC_URL: z.string().default('https://rpc.sepolia.org'),
  LOTTERY_CONTRACT_ADDRESS: z
    .string()
    .default('0x5FbDB2315678afecb367f032d93F642f64180aa3'),
  POAP_CONTRACT_ADDRESS: z
    .string()
    .default('0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'),
  RELAYER_PRIVATE_KEY: z
    .string()
    .default('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'),
  WEBHOOK_SECRET: z.string().default('etherbay-webhook-secret'),
  AWS_REGION: z.string().default('eu-west-3'),
  AWS_ACCESS_KEY_ID: z.string().default('minioadmin'),
  AWS_SECRET_ACCESS_KEY: z.string().default('minioadmin'),
  AWS_S3_BUCKET: z.string().default('blocklucky-assets'),
  AWS_S3_ENDPOINT: z.string().default('http://localhost:9000'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);
