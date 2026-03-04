export type RateLimitResult = { allowed: boolean; retryAfterSeconds?: number };

const limiterMap = new Map<string, number[]>();

export function rateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const { key, limit, windowMs } = options;
  let timestamps = limiterMap.get(key) || [];
  // Prune timestamps older than windowMs
  timestamps = timestamps.filter((ts) => now - ts < windowMs);
  if (timestamps.length >= limit) {
    const oldest = Math.min(...timestamps);
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    limiterMap.set(key, timestamps);
    return { allowed: false, retryAfterSeconds };
  }
  timestamps.push(now);
  limiterMap.set(key, timestamps);
  return { allowed: true };
}
