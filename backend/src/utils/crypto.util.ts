import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.config';

const GCM_ALGORITHM = 'aes-256-gcm';
const LEGACY_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_PREFIX = 'v2';
const KEY = Buffer.from(env.ENCRYPTION_KEY, 'hex');
const HMAC_KEY = crypto.createHmac('sha256', KEY).update('blocklucky:hmac').digest();
const BACKUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateOtpCode = (length = 6): string => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += String(crypto.randomInt(0, 10));
  }
  return otp;
};

export const generateRandomToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('base64url');
};

export const generatePromoCode = (prefix = 'EBAY'): string => {
  const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}-${randomPart}`;
};

export const generateBackupCode = (): string => {
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += BACKUP_CODE_ALPHABET[crypto.randomInt(0, BACKUP_CODE_ALPHABET.length)];
  }
  return `${code.slice(0, 5)}-${code.slice(5)}`;
};

export const normalizeBackupCode = (code: string): string =>
  code.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const hashValue = async (value: string): Promise<string> => {
  return bcrypt.hash(value, 12);
};

export const compareHash = async (value: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(value, hash);
};

export const sha256 = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

export const hmacSha256 = (value: string, key: Buffer | string = HMAC_KEY): string =>
  crypto.createHmac('sha256', key).update(value).digest('hex');

export const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export const encryptText = (text: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [ENCRYPTION_PREFIX, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':');
};

const BUFFER_IV_BYTES = 12;
const BUFFER_TAG_BYTES = 16;

export const encryptBuffer = (data: Buffer): Buffer => {
  const iv = crypto.randomBytes(BUFFER_IV_BYTES);
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
};

export const decryptBuffer = (payload: Buffer | Uint8Array): Buffer => {
  const buffer = Buffer.from(payload);
  if (buffer.length <= BUFFER_IV_BYTES + BUFFER_TAG_BYTES) throw new Error('Invalid encrypted payload format');
  const iv = buffer.subarray(0, BUFFER_IV_BYTES);
  const tag = buffer.subarray(BUFFER_IV_BYTES, BUFFER_IV_BYTES + BUFFER_TAG_BYTES);
  const decipher = crypto.createDecipheriv(GCM_ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(buffer.subarray(BUFFER_IV_BYTES + BUFFER_TAG_BYTES)), decipher.final()]);
};

export const isEncrypted =(payload: string): boolean => payload.startsWith(`${ENCRYPTION_PREFIX}:`);

export const decryptText = (encryptedPayload: string): string => {
  const parts = encryptedPayload.split(':');
  if (parts.length === 4 && parts[0] === ENCRYPTION_PREFIX && parts[1] && parts[2] && parts[3]) {
    const decipher = crypto.createDecipheriv(GCM_ALGORITHM, KEY, Buffer.from(parts[1], 'base64url'));
    decipher.setAuthTag(Buffer.from(parts[2], 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[3], 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
  if (parts.length === 2 && parts[0] && parts[1]) {
    const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, KEY, Buffer.from(parts[0], 'hex'));
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  throw new Error('Invalid encrypted payload format');
};

export const anonymizeWallet = (wallet: string): string => {
  if (!wallet || wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
};

export const maskEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
};

export const neutralizeSpreadsheetCell = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
};
