// All 20 AI models across 7 providers (spec v3 §5). Used by the model-assignment UI, the picker,
// and the router. `envVar` gates whether a real call can be made for that provider.
import type { AIModel, ModelProvider } from "@/types/models";

const ENV: Record<ModelProvider, string> = {
  Anthropic: "ANTHROPIC_API_KEY",
  Google: "GOOGLE_GEMINI_API_KEY",
  OpenAI: "OPENAI_API_KEY",
  Mistral: "MISTRAL_API_KEY",
  "Meta / HF": "HUGGINGFACE_API_KEY",
  Cohere: "COHERE_API_KEY",
  xAI: "XAI_API_KEY",
};

const m = (
  id: string,
  apiString: string,
  provider: ModelProvider,
  color: AIModel["color"],
  cost: AIModel["cost"],
  badges: AIModel["badges"],
  desc: string,
): AIModel => ({ id, name: id, apiString, provider, color, cost, badges, desc, envVar: ENV[provider] });

export const ALL_MODELS: AIModel[] = [
  // Anthropic
  m("claude-opus-4", "claude-opus-4-20250514", "Anthropic", "cyan", "high", ["reason", "code"], "Most capable — complex reasoning, deep analysis"),
  m("claude-sonnet-4", "claude-sonnet-4-20250514", "Anthropic", "cyan", "med", ["reason"], "Balanced — primary evaluator for UX analysis"),
  m("claude-sonnet-4-5", "claude-sonnet-4-5-20251001", "Anthropic", "cyan", "med", ["reason"], "Latest Sonnet — improved instruction following"),
  m("claude-haiku-4", "claude-haiku-4-5-20251001", "Anthropic", "cyan", "low", ["fast"], "Fastest — scoring, aggregation, low-stakes steps"),
  // Google
  m("gemini-2.5-pro", "gemini-2.5-pro", "Google", "teal", "high", ["reason", "vis"], "Most capable Gemini — deep analysis + vision"),
  m("gemini-1.5-pro", "gemini-1.5-pro", "Google", "teal", "med", ["reason", "vis"], "High-quality — complex multimodal reasoning"),
  m("gemini-2.0-flash", "gemini-2.0-flash", "Google", "teal", "free", ["fast", "vis"], "Latest Flash — fast vision + text"),
  m("gemini-1.5-flash", "gemini-1.5-flash", "Google", "teal", "free", ["vis", "fast"], "Reliable vision — screen reading, layout analysis"),
  // OpenAI
  m("o3", "o3", "OpenAI", "green", "high", ["reason"], "Deep reasoning — complex UX inference tasks"),
  m("gpt-4o", "gpt-4o", "OpenAI", "green", "med", ["reason", "vis"], "GPT flagship — vision + strong reasoning"),
  m("o4-mini", "o4-mini", "OpenAI", "green", "low", ["reason", "fast"], "Efficient reasoning — good for heuristic eval"),
  m("gpt-4o-mini", "gpt-4o-mini", "OpenAI", "green", "low", ["fast"], "Fast + cheap — suitable for scoring steps"),
  // Mistral
  m("mistral-large", "mistral-large-latest", "Mistral", "amber", "med", ["reason"], "Open-weight — strong instruction following"),
  m("codestral", "codestral-latest", "Mistral", "amber", "med", ["code"], "Code-specialised — for dev handoff analysis"),
  m("mistral-small", "mistral-small-latest", "Mistral", "amber", "low", ["fast"], "Fast + affordable EU-hosted option"),
  // Meta / HuggingFace
  m("llama-3.3-70b", "meta-llama/Llama-3.3-70B-Instruct", "Meta / HF", "orange", "free", ["reason", "free"], "Open source — self-host for full cost control"),
  m("llama-3.1-8b", "meta-llama/Llama-3.1-8B-Instruct", "Meta / HF", "orange", "free", ["fast", "free"], "Lightweight — fast, cheap HuggingFace inference"),
  // Cohere
  m("command-r-plus", "command-r-plus", "Cohere", "purple", "med", ["reason"], "RAG-optimised — great for doc-grounded eval"),
  m("command-r", "command-r", "Cohere", "purple", "low", ["fast"], "Fast + grounded — citation-aware analysis"),
  // xAI
  m("grok-2", "grok-2", "xAI", "red", "med", ["reason"], "Real-time knowledge + strong reasoning"),
];

export function getModelById(id: string): AIModel {
  return ALL_MODELS.find((x) => x.id === id) ?? ALL_MODELS[1]; // default claude-sonnet-4
}

/** True when the model's provider has an API key configured (server-side check). */
export function isModelAvailable(id: string): boolean {
  const model = ALL_MODELS.find((x) => x.id === id);
  if (!model) return false;
  if (model.provider === "Meta / HF") return !!process.env.HUGGINGFACE_API_KEY || !!process.env.OLLAMA_BASE_URL;
  return !!process.env[model.envVar];
}

export const COST_LABEL: Record<AIModel["cost"], string> = {
  free: "Free",
  low: "Low cost",
  med: "Medium cost",
  high: "Higher cost",
};
