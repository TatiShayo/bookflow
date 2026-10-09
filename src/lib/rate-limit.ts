/**
 * Fixed-window rate limiter.
 *
 * DESIGN NOTES
 * ------------
 * Two independent instance counts are kept so there is no "eviction race":
 * `hits` is bounded by `maxKeys` and `windows` is bounded by the same key set,
 * so a write to one always has a matching slot in the other.
 *
 * This is per-process, which on serverless means the effective limit across N
 * concurrent instances is N × `limit`. It is a coarse abuse brake, not a
 * security boundary. When this needs to become a real guarantee, swap the
 * implementation for Upstash/Redis and keep this signature.
 *
 * Memory: O(maxKeys) worst case, pruned opportunistically.
 */

const DEFAULT_MAX_KEYS = 10_000;

type Bucket = { count: number; resetAt: number };

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets. Always an integer >= 1. */
  retryAfterSeconds: number;
};

export class RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;
  private readonly buckets = new Map<string, Bucket>();
  private lastSweepAt = 0;

  constructor(limit: number, windowMs: number, maxKeys = DEFAULT_MAX_KEYS) {
    if (!Number.isFinite(limit) || limit < 1) {
      throw new Error("RateLimiter limit must be >= 1");
    }
    if (!Number.isFinite(windowMs) || windowMs < 1) {
      throw new Error("RateLimiter windowMs must be >= 1");
    }
    this.limit = Math.floor(limit);
    this.windowMs = windowMs;
    this.maxKeys = maxKeys;
  }

  /**
   * Records a hit for `key`. Call once per request, before doing work.
   */
  check(key: string): RateLimitResult {
    const now = Date.now();

    // Opportunistic sweep: at most once per window, and only when we are near
    // capacity. Avoids an O(n) scan on every request.
    if (this.buckets.size >= this.maxKeys && now - this.lastSweepAt >= this.windowMs) {
      this.sweep(now);
    }

    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      // New or expired window. If we are at capacity and this is a NEW key,
      // evict the oldest so memory stays bounded.
      if (!existing && this.buckets.size >= this.maxKeys) {
        this.evictOldest();
      }
      const bucket: Bucket = { count: 1, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
      return this.result(true, bucket, now);
    }

    existing.count += 1;
    return this.result(existing.count <= this.limit, existing, now);
  }

  private result(allowed: boolean, bucket: Bucket, now: number): RateLimitResult {
    return {
      allowed,
      remaining: Math.max(0, this.limit - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  private sweep(now: number) {
    this.lastSweepAt = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }

  /**
   * Evicts the entry with the earliest reset time. Map preserves insertion
   * order, but resets are updated in place, so a linear scan is needed — it is
   * bounded by maxKeys and runs only when full.
   */
  private evictOldest() {
    let oldestKey: string | null = null;
    let oldestReset = Infinity;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt < oldestReset) {
        oldestReset = bucket.resetAt;
        oldestKey = key;
      }
    }
    if (oldestKey !== null) this.buckets.delete(oldestKey);
  }
}

/**
 * Derives a rate-limit key from a request.
 *
 * Uses `x-forwarded-for`'s FIRST entry, which is the standard convention, but
 * notes the caveat: if the app is reachable without a proxy that *overwrites*
 * the header, a client can rotate it and defeat the limit. Prefer `req.ip`
 * where available.
 */
export function clientKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  const ip = forwarded
    ? forwarded.split(",")[0]?.trim()
    : real?.trim() || "unknown";
  return `${prefix}:${ip || "unknown"}`;
}

// Named limiters, created eagerly so construction errors surface at boot.
export const limiters = {
  /** Guest checkout is unauthenticated — cap PaymentIntent creation hard. */
  paymentIntent: new RateLimiter(5, 60_000),
  /** Booking submission itself. */
  bookingCreate: new RateLimiter(10, 60_000),
  /** Cancellation, which can trigger refunds. */
  bookingCancel: new RateLimiter(5, 60_000),
} as const;

export type LimiterName = keyof typeof limiters;

/** Thrown-free helper: returns a 429 Response or null. */
export function rateLimitOr(
  request: Request,
  name: LimiterName
): { response: Response } | null {
  const result = limiters[name].check(clientKey(request, name));
  if (result.allowed) return null;
  return {
    response: new Response(
      JSON.stringify({
        error: "Too many requests. Please wait a moment and try again.",
        retryAfterSeconds: result.retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfterSeconds),
        },
      }
    ),
  };
}
