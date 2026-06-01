// v3 testing engine types (spec v3 §6).
export interface CustomTest {
  id: string;
  user_id?: string | null;
  project_id?: string | null;
  name: string;
  description: string;
  ai_model: string;
  scope: string;
  created_at: string;
}

export type FlowMode = "single" | "before_after" | "multi_variant";

export interface TestRun {
  id: string;
  project_id: string;
  flow_mode: FlowMode;
  methods_selected: string[];
  persona_ids?: string[] | null;
  model_assignments?: unknown;
  status: string;
  ux_score_before?: number | null;
  ux_score_after?: number | null;
  ux_delta?: number | null;
  total_ai_calls?: number | null;
  created_at: string;
}
