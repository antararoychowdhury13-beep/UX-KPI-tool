// Rate limit AI routes: max 5 requests per user per minute (spec §11).
// Uses Upstash when configured; falls back to an in-memory sliding window for local dev.
import { hasRedis } from "@/lib/config";

const LIMIT = 5;
const WINDOW_MS = 60_000;

// In-memory fallback store (per server process).
const buckets = new Map<string, number[]>();

function memoryAllow(key: string): boolean {
  const nowMs = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => nowMs - t < WINDOW_MS);
  if (hits.length >= LIMIT) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(nowMs);
  buckets.set(key, hits);
  return true;
}

let upstashLimiter: { limit: (key: string) => Promise<{ success: boolean }> } | null =
  null;

async function getUpstashLimiter() {
  if (upstashLimiter) return upstashLimiter;
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");
  upstashLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(LIMIT, "60 s"),
    prefix: "uxkpi:rl",
  });
  return upstashLimiter;
}

/** Returns true if the request is allowed, false if rate-limited. */
export async function checkRateLimit(userId: string): Promise<boolean> {
  if (hasRedis) {
    const limiter = await getUpstashLimiter();
    const { success } = await limiter.limit(`user:${userId}`);
    return success;
  }
  return memoryAllow(`user:${userId}`);
}
