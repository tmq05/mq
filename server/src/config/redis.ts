import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<void>;
  del(key: string): Promise<void>;
  isRedisConnected(): boolean;
}

class InMemoryCache implements CacheStore {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<void> {
    const expiresAt = duration ? Date.now() + duration * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  isRedisConnected(): boolean {
    return false;
  }
}

class CacheService implements CacheStore {
  private redis: Redis | null = null;
  private memoryFallback = new InMemoryCache();
  private redisAvailable = false;

  constructor() {
    try {
      this.redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 3) return null; // Stop retrying after 3 attempts
          return Math.min(times * 100, 2000);
        },
        lazyConnect: true,
      });

      this.redis
        .connect()
        .then(() => {
          this.redisAvailable = true;
          logger.info('✅ Connected to Redis successfully');
        })
        .catch((err) => {
          this.redisAvailable = false;
          logger.warn(`⚠️ Redis not reachable (${err.message}). Using in-memory cache fallback.`);
        });

      this.redis.on('error', (err) => {
        if (this.redisAvailable) {
          logger.warn(`Redis connection error: ${err.message}`);
        }
        this.redisAvailable = false;
      });
    } catch {
      this.redisAvailable = false;
    }
  }

  isRedisConnected(): boolean {
    return this.redisAvailable;
  }

  async get(key: string): Promise<string | null> {
    if (this.redisAvailable && this.redis) {
      try {
        return await this.redis.get(key);
      } catch {
        this.redisAvailable = false;
      }
    }
    return this.memoryFallback.get(key);
  }

  async set(key: string, value: string, mode = 'EX', duration = 300): Promise<void> {
    if (this.redisAvailable && this.redis) {
      try {
        await this.redis.set(key, value, mode as any, duration);
        return;
      } catch {
        this.redisAvailable = false;
      }
    }
    await this.memoryFallback.set(key, value, mode, duration);
  }

  async del(key: string): Promise<void> {
    if (this.redisAvailable && this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch {
        this.redisAvailable = false;
      }
    }
    await this.memoryFallback.del(key);
  }
}

export const cache = new CacheService();

