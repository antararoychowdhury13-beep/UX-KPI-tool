// AI response cache (spec v2 §2/§10): identical input → cached output for TTL seconds.
// Uses Upstash Redis (REST) when configured, else a process-local in-memory map. This eliminates
// duplicate AI calls for the same prompt (e.g. re-running an unchanged persona config).
import { createHash } from "crypto";
import { hasRedis } from "@/lib/config";

const TTL_SECONDS = Number(process.env.AI_CACHE_TTL_SECONDS) || 86400; // 24h default

function keyFor(namespace: string, input: string): string {
  return `ai_cache:${namespace}:${createHash("sha256").update(input).digest("hex")}`;
}

// ── In-memory fallback (survives HMR via globalThis) ──────────────────────────────
type Entry = { value: string; exp: number };
const g = globalThis as unknown as { __aiCache?: Map<string, Entry> };
const mem: Map<string, Entry> = g.__aiCache ?? (g.__aiCache = new Map());

function memGet(key: string): string | null {
  const e = mem.get(key);
  if (!e) return null;
  if (e.exp < Date.now()) {
    mem.delete(key);
    return null;
  }
  return e.value;
}
function memSet(key: string, value: string, ttl: number): void {
  mem.set(key, { value, exp: Date.now() + ttl * 1000 });
}

// ── Upstash REST ──────────────────────────────────────────────────────────────────
async function redisCmd<T = unknown>(command: unknown[]): Promise<T | null> {
  try {
    const res = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: T };
    return data.result ?? null;
  } catch {
    return null; // cache must never break the request path
  }
}

async function cacheGet(key: string): Promise<string | null> {
  if (hasRedis) return redisCmd<string>(["GET", key]);
  return memGet(key);
}
async function cacheSet(key: string, value: string): Promise<void> {
  if (hasRedis) {
    await redisCmd(["SET", key, value, "EX", String(TTL_SECONDS)]);
    return;
  }
  memSet(key, value, TTL_SECONDS);
}

/**
 * Run `compute` unless an identical (namespace,input) result is cached. Only non-empty results are
 * cached. Returns { value, hit } so callers can record cache hits in usage logs.
 */
export async function cached(
  namespace: string,
  input: string,
  compute: () => Promise<string>,
): Promise<{ value: string; hit: boolean }> {
  const key = keyFor(namespace, input);
  const existing = await cacheGet(key);
  if (existing != null && existing !== "") return { value: existing, hit: true };
  const value = await compute();
  if (value && value.trim()) await cacheSet(key, value);
  return { value, hit: false };
}
