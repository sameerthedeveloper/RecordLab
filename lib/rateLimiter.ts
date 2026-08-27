/**
 * A minimal client-side sliding-window rate limiter. State lives only in
 * memory (via the ref the caller stores it in) and resets on page reload —
 * consistent with the app's no-localStorage/no-backend constraints. This
 * protects the user from accidentally burning through API quota with rapid
 * repeat clicks; it is not a security control (a determined caller can bypass
 * client-side code), just a UX guard.
 */
export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds until the next request would be allowed. 0 when allowed. */
  retryAfterMs: number;
}

export interface RateLimiter {
  tryConsume: () => RateLimitResult;
}

export function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter {
  const timestamps: number[] = [];

  return {
    tryConsume(): RateLimitResult {
      const now = Date.now();
      while (timestamps.length > 0 && now - timestamps[0] >= windowMs) {
        timestamps.shift();
      }

      if (timestamps.length >= maxRequests) {
        const retryAfterMs = windowMs - (now - timestamps[0]);
        return { allowed: false, retryAfterMs };
      }

      timestamps.push(now);
      return { allowed: true, retryAfterMs: 0 };
    },
  };
}
