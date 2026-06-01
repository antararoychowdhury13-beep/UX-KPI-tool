// Persona and synthetic usability testing types. Mirrors the database schema (spec §3).

export type TechComfort = "low" | "medium" | "high";

export interface Persona {
  id: string;
  user_id: string;
  /** null means a saved library persona (not bound to a project). */
  project_id: string | null;
  name: string;
  age_range: string | null;
  gender: string | null;
  occupation: string | null;
  tech_comfort: TechComfort;
  behavioral_traits: string[];
  goals: string | null;
  frustrations: string | null;
  /** optional richer attributes (shown on persona cards; beyond the base spec schema) */
  experience_years?: number | null;
  device_preference?: string | null;
  /** admin-created global templates available to all users. */
  is_template: boolean;
  is_synthetic: boolean;
  generated_by_ai: boolean;
  created_at: string;
}

/** Shape returned by the Claude persona-generation prompt (spec §5, Prompt 2). */
export interface GeneratedPersona {
  name: string;
  age: number;
  gender: string;
  occupation: string;
  experience_years: number;
  tech_comfort: TechComfort;
  behavioral_traits: string[];
  primary_goal: string;
  key_frustration: string;
  mental_model: string;
  accessibility_needs: string;
  device_preference: string;
}

export type ErrorLikelihood = "low" | "medium" | "high";
export type Severity = "low" | "medium" | "high";

export interface FrictionPoint {
  screen_sequence: number;
  description: string;
  severity: Severity;
  reason: string;
}

export interface SyntheticTestResult {
  id: string;
  project_id: string;
  persona_id: string;
  flow_type: ScreenshotFlowType;
  task_success_rate: number;
  friction_points: FrictionPoint[];
  time_to_task_estimate: string | null;
  error_likelihood: ErrorLikelihood;
  overall_score: number;
  raw_ai_response: unknown | null;
  tested_at: string;
}

/** Which flow variant a synthetic test ran against. */
export type ScreenshotFlowType = "before" | "after";
