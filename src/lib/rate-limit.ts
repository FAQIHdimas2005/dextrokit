/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Scope: a single server process. On serverless platforms each warm instance
 * keeps its own counters, which still stops naive request flooding from a
 * single client. For horizontally scaled deployments, replace the Map with a
 * shared store (Redis/Upstash) behind the same `checkRateLimit` signature.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 5_000;

export interface RateLimitOptions {
  /** Maximum number of requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix timestamp (ms) when the current window resets. */
  resetAt: number;
  /** Seconds until the client may retry (only meaningful when blocked). */
  retryAfterSeconds: number;
}

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();

  if (buckets.size >= MAX_TRACKED_KEYS) {
    pruneExpired(now);
    // Still saturated: drop the oldest entries (Map preserves insertion order).
    while (buckets.size >= MAX_TRACKED_KEYS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey === undefined) break;
      buckets.delete(oldestKey);
    }
  }

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;

  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/**
 * Best-effort client identity for rate limiting. Proxy headers are attacker
 * controlled on unproxied deployments, so values are trimmed and bounded; this
 * is abuse mitigation, never an authorization boundary.
 */
export function getClientIp(request: Request): string {
  // Edge-verified proxy headers (Cloudflare, Vercel) are trusted over client-supplied XFF
  const candidate =
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  if (!candidate) return "unknown";

  // Keep only characters that can appear in an IPv4/IPv6 literal, cap length.
  const sanitized = candidate.replace(/[^0-9a-fA-F:.]/g, "").slice(0, 64);
  return sanitized || "unknown";
}
