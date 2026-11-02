import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.config';

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from(env.ENCRYPTION_KEY.padEnd(64, '0').slice(0, 64), 'hex');

export const generateOtpCode = (length = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
};

export const generateRandomToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

export const generatePromoCode = (prefix = 'EBAY'): string => {
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${randomPart}`;
};

export const hashValue = async (value: string): Promise<string> => {
  return bcrypt.hash(value, 10);
};

export const compareHash = async (value: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(value, hash);
};

export const encryptText = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

export const decryptText = (encryptedPayload: string): string => {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid encrypted payload format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export const anonymizeWallet = (wallet: string): string => {
  if (!wallet || wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
};
