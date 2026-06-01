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
  /** optional richer attributes (shown on persona cards; spec v2 §3) */
  experience_years?: number | null;
  device_preference?: string | null;
  location?: string | null;
  motivation_quote?: string | null;
  role_level?: string | null;
  occupation_detail?: string | null;
  accessibility_profile?: string | null;
  /** exact age (age_range holds the bucket like "36-45"). */
  age?: number | null;
  /** numeric tech-comfort 1-10 (tech_comfort holds the low|medium|high bucket). */
  tech_comfort_score?: number | null;
  /** admin-created global templates available to all users. */
  is_template: boolean;
  is_synthetic: boolean;
  generated_by_ai: boolean;
  created_at: string;
}

/** Shape returned by the Claude persona-generation prompt (spec v2 §6, Prompt 2). */
export interface GeneratedPersona {
  name: string;
  age: number;
  age_range?: string;
  gender: string;
  occupation: string;
  occupation_detail?: string;
  role_level?: string;
  location?: string;
  experience_years: number;
  tech_comfort: TechComfort;
  tech_comfort_score?: number;
  behavioral_traits: string[];
  primary_goal: string;
  key_frustration: string;
  motivation_quote?: string;
  mental_model: string;
  accessibility_profile?: string;
  /** legacy field name still emitted by some prompt variants */
  accessibility_needs?: string;
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

/** The four synthetic testing methods (spec v2 §6, Prompts 3a–3d). */
export type TestingMethod = "heuristic" | "task_scenario" | "think_aloud" | "cognitive_load";

export const TESTING_METHODS: { value: TestingMethod; title: string; icon: string; desc: string }[] = [
  { value: "heuristic", title: "Heuristic Walkthrough", icon: "ti-checklist", desc: "Score each flow against Nielsen's 10 usability heuristics." },
  { value: "task_scenario", title: "Task Scenario Testing", icon: "ti-list-check", desc: "Simulate the persona attempting key tasks and measure success." },
  { value: "think_aloud", title: "Think-Aloud Simulation", icon: "ti-message-dots", desc: "Generate a first-person narration of the persona's experience." },
  { value: "cognitive_load", title: "Cognitive Load Mapping", icon: "ti-brain", desc: "Map mental effort screen-by-screen to find overload points." },
];

/** Nielsen's 10 heuristics, scored 0–10 (heuristic method). */
export interface HeuristicScores {
  visibility_of_system_status: number;
  match_real_world: number;
  user_control_freedom: number;
  consistency_standards: number;
  error_prevention: number;
  recognition_over_recall: number;
  flexibility_efficiency: number;
  aesthetic_minimalist: number;
  error_recovery: number;
  help_documentation: number;
}

export const HEURISTIC_LABELS: Record<keyof HeuristicScores, string> = {
  visibility_of_system_status: "Visibility of system status",
  match_real_world: "Match with real world",
  user_control_freedom: "User control & freedom",
  consistency_standards: "Consistency & standards",
  error_prevention: "Error prevention",
  recognition_over_recall: "Recognition over recall",
  flexibility_efficiency: "Flexibility & efficiency",
  aesthetic_minimalist: "Aesthetic & minimalist design",
  error_recovery: "Help users recover from errors",
  help_documentation: "Help & documentation",
};

/** One simulated task (task-scenario method). */
export interface TaskScenarioResult {
  task_name: string;
  task_description?: string;
  success: boolean;
  steps_taken: number;
  expected_steps: number;
  completion_time_estimate?: string;
  deviation_reason?: string;
  severity?: "low" | "medium" | "high" | "na";
}

/** Cognitive load at one screen (cognitive-load method). */
export interface CognitiveLoadEntry {
  screen_sequence: number;
  screen_label?: string;
  load_score: number;
  peak_areas?: string[];
  load_type?: string;
  reason?: string;
  reduction_opportunity?: string;
}

/**
 * Raw payload returned by a testing-method prompt and stored verbatim in
 * synthetic_test_results.raw_ai_response. Universal fields are always present;
 * method-specific fields are populated only for their method.
 */
export interface SyntheticTestRaw {
  testing_method?: TestingMethod;
  task_success_rate: number;
  estimated_time_to_task: string;
  friction_points: FrictionPoint[];
  error_likelihood: ErrorLikelihood;
  confidence_level: number;
  persona_reaction: string;
  overall_score: number;
  // heuristic
  heuristic_scores?: HeuristicScores;
  // task_scenario
  task_scenarios_result?: TaskScenarioResult[];
  // think_aloud
  think_aloud_transcript?: string;
  key_quotes?: string[];
  emotional_arc?: string;
  // cognitive_load
  cognitive_load_map?: CognitiveLoadEntry[];
  average_cognitive_load?: number;
  peak_load_screen?: number;
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
