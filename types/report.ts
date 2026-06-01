// Report types. Mirrors the reports table (spec §3) and the report dashboard (spec §6, Screen 7).

/** A single Konva.js annotation shape persisted per screenshot. */
export interface Annotation {
  id: string;
  type: "rect" | "arrow" | "text" | "ellipse";
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];
  text?: string;
  color?: string;
}

/** Annotations keyed by screenshot id. */
export type AnnotationMap = Record<string, Annotation[]>;

export interface Report {
  id: string;
  project_id: string;
  kpi_matrix_id: string;
  annotations: AnnotationMap;
  pdf_path: string | null;
  /** unique token powering the public, no-login shareable link. */
  share_token: string;
  created_at: string;
}

export type ApiService = "claude" | "gemini" | "huggingface" | "qwen" | "ollama";
export type ApiCallStatus = "success" | "failed" | "rate_limited";

/** An admin-managed AI service configuration (add/edit/remove in the admin panel). */
export interface AIService {
  id: string;
  name: string;
  /** stable key used in code/logs, e.g. "claude" */
  slug: string;
  role: string;
  provider: string | null;
  model: string | null;
  /** name of the env var holding this service's API key, e.g. "ANTHROPIC_API_KEY" */
  env_var: string | null;
  enabled: boolean;
  /** built-in services ship with the app; custom ones are admin-created */
  builtin: boolean;
  created_at: string;
}

export interface ApiUsageLog {
  id: string;
  user_id: string;
  service: ApiService;
  endpoint: string;
  tokens_used: number;
  cost_estimate: number;
  status: ApiCallStatus;
  called_at: string;
}
