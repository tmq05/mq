import { ASSISTANT_CONFIG } from './config.js';
import { AssistantError } from './errors.js';

interface BucketRecord {
  count: number;
  resetAt: number;
}

const minuteBuckets = new Map<string, BucketRecord>();
const dayBuckets = new Map<string, BucketRecord>();

function checkBucket(
  store: Map<string, BucketRecord>,
  key: string,
  limit: number,
  windowMs: number,
  now: number
): { allowed: boolean; retryAfterSec: number; remaining: number } {
  const current = store.get(key);
  if (!current || now >= current.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0, remaining: limit - 1 };
  }

  if (current.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec, remaining: 0 };
  }

  current.count += 1;
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: Math.max(0, limit - current.count),
  };
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
  remainingMinute: number;
  remainingDay: number;
}

/**
 * Kiểm tra giới hạn tần suất kép:
 * - Tối đa 20 tin / phút và 200 tin / ngày theo cả userId (nếu có) và IP.
 */
export function checkAssistantRateLimit(
  identifier: { userId?: string; ip: string; perMinute?: number; perDay?: number },
  now = Date.now()
): RateLimitResult {
  const limitPerMin = identifier.perMinute ?? ASSISTANT_CONFIG.rateLimit.perMinute;
  const limitPerDay = identifier.perDay ?? ASSISTANT_CONFIG.rateLimit.perDay;
  const keys = identifier.userId
    ? [`user:${identifier.userId}`, `ip:${identifier.ip}`]
    : [`ip:${identifier.ip}`];

  let minRemainingMinute = Number.MAX_SAFE_INTEGER;
  let minRemainingDay = Number.MAX_SAFE_INTEGER;

  for (const key of keys) {
    const minRes = checkBucket(
      minuteBuckets,
      `min:${key}`,
      limitPerMin,
      ASSISTANT_CONFIG.rateLimit.minuteWindowMs,
      now
    );
    if (!minRes.allowed) {
      return {
        allowed: false,
        retryAfterSec: minRes.retryAfterSec,
        remainingMinute: 0,
        remainingDay: 0,
      };
    }

    const dayRes = checkBucket(
      dayBuckets,
      `day:${key}`,
      limitPerDay,
      ASSISTANT_CONFIG.rateLimit.dayWindowMs,
      now
    );
    if (!dayRes.allowed) {
      return {
        allowed: false,
        retryAfterSec: dayRes.retryAfterSec,
        remainingMinute: minRes.remaining,
        remainingDay: 0,
      };
    }

    minRemainingMinute = Math.min(minRemainingMinute, minRes.remaining);
    minRemainingDay = Math.min(minRemainingDay, dayRes.remaining);
  }

  return {
    allowed: true,
    retryAfterSec: 0,
    remainingMinute: minRemainingMinute,
    remainingDay: minRemainingDay,
  };
}

export function enforceAssistantRateLimit(identifier: {
  userId?: string;
  ip: string;
  perMinute?: number;
  perDay?: number;
}): RateLimitResult {
  const res = checkAssistantRateLimit(identifier);
  if (!res.allowed) {
    throw new AssistantError(
      'RATE_LIMITED',
      `Bạn đã vượt giới hạn gửi tin nhắn. Vui lòng thử lại sau ${res.retryAfterSec} giây.`,
      429,
      res.retryAfterSec
    );
  }
  return res;
}

/** Dùng trong unit test để làm sạch bộ đếm */
export function resetAssistantRateLimitStore(): void {
  minuteBuckets.clear();
  dayBuckets.clear();
}
