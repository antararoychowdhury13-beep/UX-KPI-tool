// Runtime mode detection. Each external dependency runs against the real service when its env vars
// are present, and a local mock/in-memory fallback otherwise. This lets the app run end-to-end with
// zero keys, and "go live" by adding env vars — no code changes.

export const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
export const hasGemini = !!process.env.GOOGLE_GEMINI_API_KEY;
export const hasHuggingFace = !!process.env.HUGGINGFACE_API_KEY;

export const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

/** True when no persistent datastore is configured — using the in-memory store. */
export const isMockData = !hasSupabase;

export const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ── Phase 3 integrations (each needs real credentials to go live) ─────────────
export const hasMural = !!process.env.MURAL_API_KEY;
export const hasFigma = !!process.env.FIGMA_ACCESS_TOKEN;
export const hasJira = !!process.env.JIRA_API_TOKEN && !!process.env.JIRA_BASE_URL;
export const hasConfluence = !!process.env.CONFLUENCE_API_TOKEN;
