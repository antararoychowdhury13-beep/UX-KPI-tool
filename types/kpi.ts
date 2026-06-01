// KPI matrix types. Mirrors the KPI object and kpi_matrices table (spec §3, §5 Prompt 4).

export type KPICategory =
  | "efficiency"
  | "satisfaction"
  | "accessibility"
  | "error_reduction"
  | "learnability";

export type ConfidenceLevel = "low" | "medium" | "high";

export type DeltaDirection = "improvement" | "regression" | "neutral";

export interface KPI {
  id: string;
  name: string;
  category: KPICategory;
  before_score: number;
  after_score: number;
  delta: number;
  delta_direction: DeltaDirection;
  confidence_level: ConfidenceLevel;
  confidence_score: number;
  reasoning: string;
  measurement_method: string;
  ux_principle: string;
  persona_impact: string[];
}

export interface KPIMatrix {
  id: string;
  analysis_id: string;
  project_id: string;
  kpis: KPI[];
  overall_confidence: number;
  generated_at: string;
}

/** Full shape returned by the Claude KPI-generation prompt (spec §5, Prompt 4). */
export interface KPIGenerationResult {
  overall_confidence: number;
  kpis: Omit<KPI, "id">[];
  top_3_improvements: string[];
  risks_and_regressions: string[];
  post_launch_tracking_plan: string;
}
