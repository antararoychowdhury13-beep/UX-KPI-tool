// Multi-provider text generation for the Claude-style tasks (personas, synthetic testing, KPIs).
// Picks the first provider that is BOTH configured (key/URL present) AND enabled in the admin
// panel, in priority order: Claude → Qwen → Ollama. Returns null if none is available so callers
// fall back to deterministic mock output.
import { isServiceEnabled, getAIServiceBySlug } from "@/lib/db";

function modelFor(slug: string, fallback: string): string {
  return getAIServiceBySlug(slug)?.model || fallback;
}

async function viaClaude(prompt: string): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: modelFor("claude", "claude-sonnet-4-20250514"),
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

async function viaQwen(prompt: string): Promise<string> {
  // DashScope OpenAI-compatible endpoint.
  const base = process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.QWEN_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelFor("qwen", "qwen2.5-72b-instruct"),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Qwen ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function viaOllama(prompt: string): Promise<string> {
  const base = process.env.OLLAMA_BASE_URL!.replace(/\/$/, "");
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelFor("ollama", "llama3.2"),
      messages: [{ role: "user", content: prompt }],
      stream: false,
      format: "json", // force parseable JSON output
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message?.content ?? "";
}

export interface ResolvedProvider {
  slug: "claude" | "qwen" | "ollama";
  run: (prompt: string) => Promise<string>;
}

/** The active text provider, or null when none is configured+enabled. */
export function resolveTextProvider(): ResolvedProvider | null {
  if (process.env.ANTHROPIC_API_KEY && isServiceEnabled("claude")) {
    return { slug: "claude", run: viaClaude };
  }
  if (process.env.QWEN_API_KEY && isServiceEnabled("qwen")) {
    return { slug: "qwen", run: viaQwen };
  }
  if (process.env.OLLAMA_BASE_URL && isServiceEnabled("ollama")) {
    return { slug: "ollama", run: viaOllama };
  }
  return null;
}

/** Generate text with the active provider, or null if none available. */
export async function generateText(prompt: string): Promise<string | null> {
  const provider = resolveTextProvider();
  if (!provider) return null;
  return provider.run(prompt);
}
