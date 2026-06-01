// Model router (spec v3 §19). Routes a generation to the assigned model's provider when that
// provider's API key is configured; otherwise falls back to the active default provider
// (Claude/Qwen/Ollama via providers.ts) or the deterministic mock. Responses are cached by
// modelId+prompt hash (24h). Never called directly from components — only via lib/ai wrappers.
import { cached } from "@/lib/ai/cache";
import { getModelById } from "@/lib/models/registry";
import { generateText } from "@/lib/ai/providers";
import type { AIModel } from "@/types/models";

async function viaAnthropic(apiString: string, prompt: string): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: apiString,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

async function viaGemini(apiString: string, prompt: string): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genai = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
  const model = genai.getGenerativeModel({ model: apiString });
  const res = await model.generateContent(prompt);
  return res.response.text();
}

// OpenAI, Mistral and xAI all speak the OpenAI chat-completions format.
async function viaOpenAICompat(base: string, key: string, apiString: string, prompt: string): Promise<string> {
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: apiString, messages: [{ role: "user", content: prompt }] }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${base} ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** A direct runner for the model's provider if its key is set, else null (→ fall back). */
function directRunner(model: AIModel): ((prompt: string) => Promise<string>) | null {
  switch (model.provider) {
    case "Anthropic":
      return process.env.ANTHROPIC_API_KEY ? (p) => viaAnthropic(model.apiString, p) : null;
    case "Google":
      return process.env.GOOGLE_GEMINI_API_KEY ? (p) => viaGemini(model.apiString, p) : null;
    case "OpenAI":
      return process.env.OPENAI_API_KEY ? (p) => viaOpenAICompat("https://api.openai.com/v1", process.env.OPENAI_API_KEY!, model.apiString, p) : null;
    case "Mistral":
      return process.env.MISTRAL_API_KEY ? (p) => viaOpenAICompat("https://api.mistral.ai/v1", process.env.MISTRAL_API_KEY!, model.apiString, p) : null;
    case "xAI":
      return process.env.XAI_API_KEY ? (p) => viaOpenAICompat("https://api.x.ai/v1", process.env.XAI_API_KEY!, model.apiString, p) : null;
    // Cohere / Meta-HF: no dedicated client wired yet → fall back to the active provider.
    default:
      return null;
  }
}

/**
 * Generate text using the assigned model. Falls back to the active default provider (and then the
 * caller's mock) when the model's provider isn't configured or errors. Returns null → caller mocks.
 */
export async function generateWithModel(modelId: string, prompt: string): Promise<string | null> {
  const model = getModelById(modelId);
  const direct = directRunner(model);
  if (direct) {
    const { value } = await cached(modelId, prompt, () => direct(prompt).catch(() => ""));
    if (value) return value;
  }
  // No key for this provider (or it failed) — use the active configured provider, else mock.
  return generateText(prompt);
}
