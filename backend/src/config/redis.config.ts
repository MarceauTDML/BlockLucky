import Redis from 'ioredis';
import { env } from './env.config';

const CACHE_COMMAND_TIMEOUT_MS = 500;
const TTL_JITTER_RATIO = 0.1;

export const withJitter = (ttlSeconds: number): number => {
  const spread = Math.floor(ttlSeconds * TTL_JITTER_RATIO);
  if (spread === 0) return ttlSeconds;
  return ttlSeconds - spread + Math.floor(Math.random() * (spread * 2 + 1));
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Redis timeout')), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

class RedisManager {
  private client: Redis | null = null;
  private memoryStore: Map<string, { value: string; expiresAt?: number | undefined }> = new Map();
  private readonly prefix = `${env.REDIS_KEY_PREFIX}:${env.NODE_ENV}:`;

  constructor() {
    if (env.NODE_ENV !== 'test') {
      try {
        this.client = new Redis(env.REDIS_URL, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: true,
          connectionName: 'blocklucky-backend',
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 200, 1000);
          },
        });
        this.client.on('error', () => {});
      } catch {
        this.client = null;
      }
    }
  }

  private key(key: string): string {
    return `${this.prefix}${key}`;
  }

  private isReady(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  public getRawClient(): Redis | null {
    return this.client;
  }

  public async get(key: string): Promise<string | null> {
    if (this.client && this.isReady()) {
      try {
        return await withTimeout(this.client.get(this.key(key)), CACHE_COMMAND_TIMEOUT_MS);
      } catch {}
    }
    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ? withJitter(ttlSeconds) : undefined;
    if (this.client && this.isReady()) {
      try {
        const command = ttl
          ? this.client.set(this.key(key), value, 'EX', ttl)
          : this.client.set(this.key(key), value);
        await withTimeout(command, CACHE_COMMAND_TIMEOUT_MS);
        return;
      } catch {}
    }
    this.memoryStore.set(key, { value, expiresAt: ttl ? Date.now() + ttl * 1000 : undefined });
  }

  public async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (this.client && this.isReady()) {
      try {
        const result = await withTimeout(
          this.client.set(this.key(key), value, 'EX', ttlSeconds, 'NX'),
          CACHE_COMMAND_TIMEOUT_MS
        );
        return result === 'OK';
      } catch {}
    }
    const existing = this.memoryStore.get(key);
    if (existing && (!existing.expiresAt || existing.expiresAt > Date.now())) return false;
    this.memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return true;
  }

  public async del(key: string): Promise<void> {
    if (this.client && this.isReady()) {
      try {
        await withTimeout(this.client.unlink(this.key(key)), CACHE_COMMAND_TIMEOUT_MS);
      } catch {}
    }
    this.memoryStore.delete(key);
  }

  public async ping(timeoutMs = 1000): Promise<'up' | 'down' | 'disabled'> {
    if (!this.client) return 'disabled';
    if (this.client.status === 'wait') {
      try {
        await withTimeout(this.client.connect(), timeoutMs);
      } catch {
        return 'down';
      }
    }
    if (!this.isReady()) return 'down';
    try {
      await withTimeout(this.client.ping(), timeoutMs);
      return 'up';
    } catch {
      return 'down';
    }
  }

  public async close(): Promise<void> {
    if (!this.client) return;
    try {
      if (this.client.status === 'ready') await this.client.quit();
      else this.client.disconnect();
    } catch {
      this.client.disconnect();
    }
  }
}

export const redis = new RedisManager();
export default redis;
