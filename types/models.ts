// AI model registry types (spec v3 §5).
export type ModelProvider = "Anthropic" | "Google" | "OpenAI" | "Mistral" | "Meta / HF" | "Cohere" | "xAI";
export type ModelCost = "free" | "low" | "med" | "high";
export type ModelBadge = "reason" | "vis" | "fast" | "code" | "free";
export type ModelColor = "cyan" | "teal" | "green" | "amber" | "orange" | "purple" | "red";

export interface AIModel {
  id: string;
  /** display name (JetBrains Mono) */
  name: string;
  /** actual API model string */
  apiString: string;
  provider: ModelProvider;
  color: ModelColor;
  cost: ModelCost;
  badges: ModelBadge[];
  desc: string;
  /** env var that must be set for this model's provider to make real calls */
  envVar: string;
}

/** Per-project model assignment per evaluation step (spec v3 §6 ai_model_assignments). */
export interface ModelAssignments {
  vision: string;
  eval: string;
  score: string;
  kpi: string;
  /** per-method overrides keyed by method id */
  method_overrides?: Record<string, string>;
}

export const EVAL_STEPS: { key: keyof Omit<ModelAssignments, "method_overrides">; label: string }[] = [
  { key: "vision", label: "Screen reading" },
  { key: "eval", label: "Persona evaluation" },
  { key: "score", label: "Scoring & aggregation" },
  { key: "kpi", label: "KPI inference" },
];

export const DEFAULT_ASSIGNMENTS: ModelAssignments = {
  vision: "gemini-1.5-flash",
  eval: "claude-sonnet-4",
  score: "claude-haiku-4",
  kpi: "claude-sonnet-4",
  method_overrides: {},
};
