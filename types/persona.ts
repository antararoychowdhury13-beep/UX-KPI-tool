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

/**
 * Synthetic testing methods. The first four have bespoke structured outputs (Prompts 3a–3d,
 * spec v2 §6); the rest run through a generic evaluation prompt driven by their `focus`.
 */
export type TestingMethod = string;

export interface TestingMethodDef {
  value: string;
  title: string;
  icon: string;
  desc: string;
  /** what the AI should evaluate (used by the generic-method prompt) */
  focus: string;
}

/** The four methods with dedicated prompts + result views. */
export const SPECIAL_METHODS = ["heuristic", "task_scenario", "think_aloud", "cognitive_load"];

export const TESTING_METHODS: TestingMethodDef[] = [
  { value: "heuristic", title: "Heuristic Walkthrough", icon: "ti-checklist", desc: "Score each flow against Nielsen's 10 usability heuristics.", focus: "Nielsen's 10 usability heuristics" },
  { value: "task_scenario", title: "Task Scenario Testing", icon: "ti-list-check", desc: "Simulate the persona attempting key tasks and measure success.", focus: "task completion across 5 key scenarios" },
  { value: "think_aloud", title: "Think-Aloud Simulation", icon: "ti-message-dots", desc: "Generate a first-person narration of the persona's experience.", focus: "first-person think-aloud narration" },
  { value: "cognitive_load", title: "Cognitive Load Mapping", icon: "ti-brain", desc: "Map mental effort screen-by-screen to find overload points.", focus: "cognitive load per screen" },
  { value: "first_click", title: "First-Click Test", icon: "ti-click", desc: "Predict the first click per task and whether it leads to success.", focus: "where the persona clicks first for each key task and whether that path is correct" },
  { value: "five_second", title: "5-Second Test", icon: "ti-clock-bolt", desc: "Capture first impression and recall after a 5-second glance.", focus: "the persona's first impression, recall, and perceived purpose after a 5-second glance" },
  { value: "accessibility_audit", title: "Accessibility Audit", icon: "ti-accessible", desc: "Evaluate against WCAG 2.1 AA across each screen.", focus: "WCAG 2.1 AA: colour contrast, focus order, labels, keyboard operability, and target sizes" },
  { value: "findability", title: "Findability / Info Scent", icon: "ti-search", desc: "Assess whether labels and cues lead to the right place.", focus: "information scent — whether labels and cues guide the persona to the correct destination" },
  { value: "error_recovery", title: "Error Recovery", icon: "ti-alert-triangle", desc: "How well the flow prevents, surfaces, and recovers from errors.", focus: "error prevention, how clearly errors are surfaced, and how easily the persona recovers" },
  { value: "emotional_response", title: "Emotional Response", icon: "ti-mood-smile", desc: "Gauge desirability and emotional reaction across the journey.", focus: "emotional reaction and desirability at each stage of the journey" },
  { value: "trust_credibility", title: "Trust & Credibility", icon: "ti-shield-check", desc: "Evaluate trust signals, transparency, and credibility cues.", focus: "trust signals, transparency, and credibility cues" },
  { value: "learnability", title: "Learnability", icon: "ti-school", desc: "Predict first-use learning curve and time-to-proficiency.", focus: "first-use learning curve and time to proficiency" },
  { value: "expert_efficiency", title: "Expert Efficiency", icon: "ti-bolt", desc: "Assess shortcuts, batch actions, and speed for power users.", focus: "efficiency for expert/power users: shortcuts, batch actions, and steps saved" },
  { value: "visual_hierarchy", title: "Visual Hierarchy", icon: "ti-layout-2", desc: "Evaluate scanning order, emphasis, and where attention lands.", focus: "visual hierarchy — scanning order, emphasis, and where attention lands first" },
  { value: "content_clarity", title: "Content & Microcopy", icon: "ti-typography", desc: "Assess clarity, tone, and helpfulness of labels and copy.", focus: "clarity, tone, and helpfulness of labels, microcopy, and instructions" },
  { value: "mobile_ergonomics", title: "Mobile Ergonomics", icon: "ti-device-mobile", desc: "Evaluate reachability, tap targets, and one-handed use.", focus: "mobile ergonomics — thumb reachability, tap-target size, and one-handed operability" },
  { value: "form_usability", title: "Form Usability", icon: "ti-forms", desc: "Assess field design, validation, and completion effort.", focus: "form usability — field design, inline validation, and effort to complete" },
  { value: "navigation", title: "Navigation & Wayfinding", icon: "ti-compass", desc: "Evaluate orientation, structure, and ease of moving around.", focus: "navigation and wayfinding — orientation, structure, and ease of moving through the flow" },
  { value: "decision_friction", title: "Decision Friction", icon: "ti-arrows-split-2", desc: "Apply Hick's Law: assess choice overload and decision points.", focus: "decision friction via Hick's Law — choice overload at key decision points" },
  { value: "conversion_funnel", title: "Conversion Funnel", icon: "ti-filter", desc: "Predict drop-off at each step of the conversion funnel.", focus: "conversion funnel drop-off — likelihood of abandoning at each step" },
];

/** One finding from a generic-method evaluation. */
export interface MethodFinding {
  title: string;
  severity: "low" | "medium" | "high" | "positive";
  description: string;
  recommendation?: string;
}

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
  // generic methods (first-click, accessibility, trust, etc.)
  findings?: MethodFinding[];
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
