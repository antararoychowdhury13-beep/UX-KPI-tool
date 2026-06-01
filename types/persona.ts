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

export type MethodCategory = "heuristic" | "behavioral" | "cognitive" | "task" | "accessibility" | "emotional";
/** Which model-assignment step a method's primary evaluation maps to. */
export type MethodStep = "eval" | "score" | "vision";

export interface MethodGuideStep {
  t: string;
  d: string;
}

export interface TestingMethodDef {
  /** stable id, also the stored testing_method value */
  value: string;
  /** display number e.g. "01" */
  n: string;
  title: string;
  icon: string;
  desc: string;
  category: MethodCategory;
  /** primary evaluation step → which assigned model runs it */
  step: MethodStep;
  /** weight in the composite UX score (spec v3 §9) */
  weight: number;
  tags: string[];
  /** scoring formula (JetBrains Mono, multi-line) */
  formula: string;
  /** step-by-step AI evaluation guide */
  steps: MethodGuideStep[];
  /** output fields the method produces */
  outputs: string[];
  /** short lens phrase for the generic evaluation prompt */
  focus: string;
}

/** The four methods with dedicated prompts + result views. */
export const SPECIAL_METHODS = ["heuristic", "task_scenario", "think_aloud", "cognitive_load"];

export const TESTING_METHODS: TestingMethodDef[] = [
  { value: "heuristic", n: "01", icon: "ti-eye", title: "Nielsen's Heuristic Eval", desc: "Scores all 10 Nielsen heuristics per screen per persona.", category: "heuristic", step: "eval", weight: 1.2, tags: ["10 heuristics", "per screen", "severity"], focus: "Nielsen's 10 usability heuristics with severity-weighted scoring", formula: "H_score = Σ(heuristic_i × sev_weight) / 10\nOverall = avg(H_score) across screens\nSeverity: High=0.5, Medium=0.8, Low=1.0", steps: [{ t: "Read screens", d: "Vision model reads all screenshots, describes layout, elements, affordances, labels." }, { t: "Load persona", d: "Loads persona profile — tech comfort, role, behavioural traits, mental model." }, { t: "Score 10 heuristics", d: "Evaluates each Nielsen heuristic (0-10) per screen: Visibility, Match, User Control, Consistency, Error Prevention, Recognition, Flexibility, Aesthetics, Recovery, Help." }, { t: "Weight by severity", d: "High violation 0.5×, Medium 0.8×, Low 1.0× applied to each score." }, { t: "Aggregate persona score", d: "Average all screen scores to produce persona H_score 0-10." }, { t: "Output friction map", d: "Returns per-screen friction with heuristic reference, severity, recommendation." }], outputs: ["heuristic_scores (10 values)", "friction_points[]", "per_screen_scores[]", "overall_score /10"] },
  { value: "task_scenario", n: "02", icon: "ti-route", title: "Task Scenario Testing", desc: "Generates 5 tasks and simulates persona completing each.", category: "task", step: "eval", weight: 1.3, tags: ["5 tasks", "success rate", "step deviation"], focus: "completion of 5 role-relevant tasks with success rate and step deviation", formula: "T_score = Σ(success_i × complexity_weight_i) / Σ(weights)\nSuccess: Complete=1.0, Partial=0.5, Abandoned=0\nComplexity: Simple=1.0, Medium=1.3, Complex=1.6", steps: [{ t: "Generate 5 tasks", d: "Creates tasks relevant to persona role and flow type — mix of simple, medium, complex." }, { t: "Define optimal paths", d: "For each task: optimal step count, expected entry + exit points." }, { t: "Simulate completion", d: "Persona navigates each task. Wrong turns, hesitations, abandonments recorded." }, { t: "Classify outcomes", d: "Each task: complete (1.0), partial (0.5), abandoned (0)." }, { t: "Apply complexity weights", d: "Weighted average across all 5 tasks." }, { t: "Return results", d: "task_scenarios_result[] with steps_taken, expected_steps, deviation_reason, time." }], outputs: ["task_scenarios_result[]", "task_success_rate", "t_score /10", "abandoned_tasks[]"] },
  { value: "think_aloud", n: "03", icon: "ti-messages", title: "Think-Aloud Simulation", desc: "First-person verbal transcript of persona navigating each screen.", category: "behavioral", step: "eval", weight: 1.0, tags: ["transcript", "emotional arc", "key quotes"], focus: "first-person think-aloud narration with emotional arc and key quotes", formula: "TA_score = sentiment × 0.4 + task_success × 0.4 + clarity × 0.2\nSentiment from NLP tone analysis of transcript", steps: [{ t: "Load mental model", d: "Persona motivation_quote, goals, frustrations, mental_model loaded as seed." }, { t: "Generate narration", d: "First-person narration per screen — what the persona thinks, notices, does." }, { t: "Mark inflection points", d: "Confusion, frustration, confidence, delight moments tagged." }, { t: "Extract key quotes", d: "2-3 representative quotes: 1 frustration, 1 clarity, 1 delight." }, { t: "Score emotional arc", d: "smooth / frustrated-to-confident / confused / delighted." }, { t: "Calculate TA_score", d: "Sentiment scored 0-10. Combined formula applied." }], outputs: ["think_aloud_transcript", "key_quotes[]", "emotional_arc", "ta_score /10"] },
  { value: "cognitive_load", n: "04", icon: "ti-brain", title: "Cognitive Load Mapping", desc: "Scores mental effort per screen and identifies overload zones.", category: "cognitive", step: "eval", weight: 1.1, tags: ["per screen", "load type", "peak zones"], focus: "extraneous cognitive load per screen and overload zones", formula: "CL_score = 10 - avg(extraneous_load_per_screen)\nTypes: Intrinsic + Extraneous + Germane (only Extraneous penalised)", steps: [{ t: "Set persona baseline", d: "Cognitive baseline from tech_comfort_score — lower comfort, lower tolerance." }, { t: "Read information density", d: "Vision model counts info elements per screen: text, inputs, nav, tables." }, { t: "Score load per screen", d: "0-10 per screen per load type. Annotate peak overload UI areas." }, { t: "Classify load type", d: "Intrinsic, Extraneous (UX problem), or Germane. Only Extraneous penalised." }, { t: "Calculate average", d: "Average load across screens. Peak screen identified." }, { t: "Return load map", d: "cognitive_load_map[] with score, type, peak areas, reduction opportunity." }], outputs: ["cognitive_load_map[]", "average_load", "peak_load_screen", "reduction_opportunities[]"] },
  { value: "fitts", n: "05", icon: "ti-target", title: "Fitts' Law Analysis", desc: "Estimates click target distances and sizes to predict interaction speed.", category: "cognitive", step: "score", weight: 0.8, tags: ["targets", "distance", "interaction time"], focus: "Fitts' Law — target distance and size driving interaction speed", formula: "T = a + b×log₂(D/W+1)\nD=distance, W=width, a=0.2, b=0.1\nF_score = 10-(avg_T/max_T×10)", steps: [{ t: "Extract interactive elements", d: "Vision model identifies clickable elements with estimated positions." }, { t: "Estimate distances", d: "Relative distances between sequential targets estimated." }, { t: "Apply Fitts formula", d: "Formula applied to each target pair. T values calculated." }, { t: "Flag slow targets", d: "Targets with high T or W<44px flagged as friction." }], outputs: ["fitts_scores[]", "slow_targets[]", "f_score /10"] },
  { value: "hicks", n: "06", icon: "ti-menu-2", title: "Hick's Law Analysis", desc: "Counts choices at decision points and estimates decision time.", category: "cognitive", step: "score", weight: 0.8, tags: ["choice count", "decision time", "overload"], focus: "Hick's Law — choice count at decision points and decision time", formula: "RT = b × log₂(n+1), b=0.166s/bit\nScreens n>7 flagged (Miller's Law)\nH_score = 10-(avg_RT/max_RT×10)", steps: [{ t: "Count choices per screen", d: "Counts nav options, CTAs, menu items per screen." }, { t: "Identify decision points", d: "Screens requiring binary or multi-choice decisions." }, { t: "Apply Hick's formula", d: "Decision time estimated at each decision point." }, { t: "Flag overloaded screens", d: "Screens with n>7 choices flagged as overloaded." }], outputs: ["hick_scores[]", "overloaded_screens[]", "h_score /10"] },
  { value: "gestalt", n: "07", icon: "ti-layout", title: "Gestalt Principles Audit", desc: "Checks proximity, similarity, continuity, closure across layouts.", category: "heuristic", step: "eval", weight: 0.9, tags: ["proximity", "similarity", "grouping"], focus: "Gestalt principles — proximity, similarity, continuity, closure, figure-ground, symmetry", formula: "G_score = Σ(principle_pass × weight) / Σ(weights)\nProximity(1.2) Similarity(1.1) Continuity(1.0) Closure(0.8) Figure-Ground(1.0) Symmetry(0.9)", steps: [{ t: "Describe visual groupings", d: "Describes how elements are visually grouped per screen." }, { t: "Check proximity", d: "Related elements close together? Unrelated separated?" }, { t: "Check similarity + continuity", d: "Similar elements look similar? Eye flows logically?" }, { t: "Score 6 principles", d: "Each: pass/partial/fail with justification + improvement note." }], outputs: ["gestalt_scores{}", "principle_failures[]", "g_score /10"] },
  { value: "accessibility", n: "08", icon: "ti-accessible", title: "WCAG 2.1 AA Audit", desc: "Checks 25 AA criteria: contrast, target size, keyboard nav.", category: "accessibility", step: "eval", weight: 1.2, tags: ["WCAG AA", "contrast", "keyboard"], focus: "WCAG 2.1 AA — contrast, target size, keyboard nav, semantic structure", formula: "A11y = (Σ(pass × level_weight)) / (total × max_weight) × 100\nLevel A=3, AA=2, AAA=1", steps: [{ t: "Load a11y profile", d: "Persona accessibility_profile loaded: none/visual/motor/cognitive." }, { t: "Check contrast", d: "Vision estimates contrast; WCAG AA minimums applied (4.5:1, 3:1 large)." }, { t: "Check target sizes", d: "44×44px minimum. Undersized targets flagged." }, { t: "Check keyboard nav", d: "Tab order, focus indicators, skip links, ARIA roles." }, { t: "Check semantics", d: "Heading hierarchy, alt text, form labels, landmarks." }, { t: "Score 25 criteria", d: "Returns a11y_score (0-100) with pass/fail per criterion." }], outputs: ["a11y_score /100", "wcag_violations[]", "contrast_failures[]", "keyboard_issues[]"] },
  { value: "error_prev", n: "09", icon: "ti-shield-check", title: "Error Prevention Analysis", desc: "Maps error-prone interactions and evaluates recovery paths.", category: "heuristic", step: "eval", weight: 1.0, tags: ["error likelihood", "recovery", "validation"], focus: "error-prone interactions, validation, and recovery paths", formula: "EP = 1-(Σ(error_risk × sev_weight)/max_risk) × 10\nDestructive=3, Correctable=2, Cosmetic=1", steps: [{ t: "Identify error-prone interactions", d: "Form fields, destructive actions, ambiguous CTAs, irreversible decisions flagged." }, { t: "Score error likelihood", d: "low/medium/high per interaction per persona mental model." }, { t: "Check validation", d: "Inline validation, confirmation dialogs, undo present?" }, { t: "Evaluate recovery paths", d: "If error occurs, is recovery clear and forgiving?" }], outputs: ["error_prone_interactions[]", "recovery_quality_score", "ep_score /10"] },
  { value: "prog_disc", n: "10", icon: "ti-stack", title: "Progressive Disclosure", desc: "Evaluates whether complexity is revealed progressively or dumped upfront.", category: "cognitive", step: "score", weight: 0.8, tags: ["info density", "reveal timing", "complexity"], focus: "progressive disclosure — whether complexity is revealed at the right time", formula: "PD = (info_at_right_time / total_info) × 10\nEarly reveal -0.5/element, Late reveal -1.0/missing element", steps: [{ t: "Map information density", d: "Counts visible information elements per screen." }, { t: "Check disclosure sequence", d: "Advanced features hidden until needed? Defaults sensible?" }, { t: "Score timing", d: "Too early = overload. Too late = confusion." }, { t: "Return disclosure map", d: "pd_score, overloaded_screens[], reveal_improvements[]." }], outputs: ["pd_score /10", "overloaded_screens[]", "reveal_improvements[]"] },
  { value: "mental_model", n: "11", icon: "ti-brain", title: "Mental Model Alignment", desc: "Checks how closely UI matches the persona's existing expectations.", category: "behavioral", step: "eval", weight: 1.1, tags: ["terminology", "nav patterns", "metaphors"], focus: "alignment between UI and the persona's existing mental model", formula: "MM = (matches / (matches+mismatches)) × 10\nterminology(1.3) nav(1.2) metaphor(1.0) interaction(1.1)", steps: [{ t: "Load mental model", d: "Persona mental_model field — expectations from prior tool usage." }, { t: "Compare terminology", d: "Do labels, headings, CTAs match what this persona expects?" }, { t: "Check nav patterns", d: "Does nav structure match how the persona organises the domain?" }, { t: "Score alignment", d: "mm_score, terminology_mismatches[], expectation_gaps[]." }], outputs: ["mm_score /10", "terminology_mismatches[]", "expectation_gaps[]"] },
  { value: "flow_eff", n: "12", icon: "ti-route-2", title: "Flow Efficiency Analysis", desc: "Measures task path length, backtracking, and dead-end detection.", category: "task", step: "score", weight: 1.0, tags: ["path length", "backtracking", "dead ends"], focus: "task path efficiency — optimal vs actual steps, backtracking, dead ends", formula: "FE = (optimal_steps / actual_steps) × 10\nPenalty: dead_ends×2 + backtracks×1.5", steps: [{ t: "Define optimal path", d: "Minimum steps to complete the primary task." }, { t: "Simulate persona path", d: "Deviations, backtracks, dead ends recorded." }, { t: "Calculate ratio", d: "optimal / actual. 1.0 = perfect efficiency." }, { t: "Flag dead ends", d: "Screens where persona cannot proceed without backtracking." }], outputs: ["flow_efficiency_score /10", "path_analysis{}", "dead_ends[]"] },
  { value: "first_click", n: "13", icon: "ti-click", title: "First-Click Testing", desc: "Predicts where each persona clicks first on each screen.", category: "task", step: "eval", weight: 0.9, tags: ["first click", "attention", "nav confidence"], focus: "first-click accuracy per screen based on attention and label clarity", formula: "FC = correct_first_clicks / total_screens × 10\nPartial credit 0.5 for understandable but suboptimal", steps: [{ t: "Define correct first click", d: "Primary intended action per screen from the flow." }, { t: "Simulate attention", d: "F-pattern, Z-pattern, or goal-directed — by persona tech comfort." }, { t: "Predict first click", d: "Target predicted from visual weight, position, label clarity." }, { t: "Score accuracy", d: "Correct / total screens." }], outputs: ["first_click_map[]", "fc_score /10", "mislabelled_ctas[]"] },
  { value: "desirability", n: "14", icon: "ti-heart", title: "Desirability & Appeal", desc: "Evaluates visual appeal, brand fit, and emotional response.", category: "emotional", step: "eval", weight: 0.7, tags: ["visual appeal", "brand fit", "delight"], focus: "visual appeal, brand alignment, and emotional response", formula: "DA = (visual_quality×0.35) + (brand_alignment×0.35) + (emotion×0.3)", steps: [{ t: "Load brand context", d: "Industry + product description define the expected aesthetic." }, { t: "Evaluate visual quality", d: "Whitespace, typography, colour, balance analysed." }, { t: "Check brand alignment", d: "Does design match expectations for this persona?" }, { t: "Score emotional response", d: "Trustworthy, professional, modern?" }], outputs: ["da_score /10", "visual_quality_score", "brand_alignment_score", "emotional_response"] },
  { value: "five_sec", n: "15", icon: "ti-clock-bolt", title: "5-Second Test Simulation", desc: "Simulates what persona recalls after 5 seconds on each screen.", category: "behavioral", step: "eval", weight: 0.8, tags: ["recall", "first impression", "key message"], focus: "5-second recall of purpose, primary CTA, and key info", formula: "5S = recalled_key / intended_key × 10\nKey = {purpose, primary CTA, key info}", steps: [{ t: "Define intended takeaways", d: "3 per screen: purpose, action, key info." }, { t: "Simulate 5-second attention", d: "Visual attention window simulated by hierarchy." }, { t: "Generate recall list", d: "What the persona would report remembering." }, { t: "Score accuracy", d: "recalled / intended." }], outputs: ["recall_results[]", "5s_score /10", "missing_elements[]"] },
  { value: "kano", n: "16", icon: "ti-stars", title: "Kano Model Classification", desc: "Classifies features as Must-have, Performance, or Delighter.", category: "behavioral", step: "eval", weight: 0.9, tags: ["must-have", "delighters", "satisfaction"], focus: "Kano classification of features into must-have / performance / delighter", formula: "Kano = (must_have×3 + delighter×1 + perf_delta×2) / max × 10\nDissatisfier: -2 per instance", steps: [{ t: "Inventory features", d: "Lists all visible features per screen." }, { t: "Classify per persona", d: "Must-have / Performance / Delighter / Indifferent / Dissatisfier." }, { t: "Check must-haves", d: "All must-have features visible and accessible?" }, { t: "Score impact", d: "Weighted formula applied. Dissatisfiers penalised." }], outputs: ["kano_classification{}", "must_haves_missing[]", "kano_score /10"] },
  { value: "ux_writing", n: "17", icon: "ti-text-caption", title: "UX Writing & Microcopy", desc: "Evaluates label clarity, CTAs, error messages, and tone.", category: "heuristic", step: "eval", weight: 0.8, tags: ["labels", "CTAs", "error messages"], focus: "label clarity, CTA effectiveness, error messages, and tone consistency", formula: "UXW = label_clarity×0.35 + cta_eff×0.30 + error_qual×0.20 + tone×0.15", steps: [{ t: "Extract all text", d: "Labels, buttons, headings, placeholders, error messages extracted." }, { t: "Evaluate label clarity", d: "Self-explanatory? Right reading level? No jargon?" }, { t: "Score CTAs", d: "Starts with verb, specific outcome, visible, distinct." }, { t: "Check error messages", d: "Human, actionable, non-blaming, specific." }, { t: "Evaluate tone", d: "Consistent across screens, matching persona." }], outputs: ["uxw_score /10", "unclear_labels[]", "weak_ctas[]", "poor_error_messages[]"] },
  { value: "conv_path", n: "18", icon: "ti-trending-up", title: "Conversion Path Analysis", desc: "Maps critical path and scores drop-off risk at every step.", category: "task", step: "eval", weight: 1.1, tags: ["drop-off risk", "critical path", "funnel"], focus: "conversion funnel — drop-off risk weighted by step position", formula: "CP = 10 - Σ(drop_off×pos_weight) / max_friction\nstep1=2.0, step2=1.8, step3=1.5, step4+=1.0", steps: [{ t: "Define critical path", d: "Mandatory sequence from entry to goal completion." }, { t: "Score drop-off risk", d: "Each step scored for abandonment likelihood per persona." }, { t: "Weight by position", d: "Earlier drop-offs weighted higher." }, { t: "Flag hotspots", d: "Steps with >0.7 drop-off risk are critical." }, { t: "Return funnel", d: "critical_path_map[], drop_off_risks[], cp_score." }], outputs: ["critical_path_map[]", "drop_off_risks[]", "cp_score /10"] },
  { value: "inclusive", n: "19", icon: "ti-heart-handshake", title: "Inclusive Design Review", desc: "Audits for age bias, cultural assumptions, language barriers.", category: "accessibility", step: "eval", weight: 0.9, tags: ["exclusion audit", "cultural", "age inclusivity"], focus: "inclusive design — age, culture, language, and ability inclusivity", formula: "ID = (inclusion_passes / 12) × 10\n12 criteria: age(3) + culture(3) + language(3) + ability(3)", steps: [{ t: "Load demographic context", d: "Age, location, accessibility profile, role level inform the lens." }, { t: "Check age inclusivity", d: "Fonts, targets, terminology for 55+ if applicable?" }, { t: "Check cultural assumptions", d: "Date formats, icons, metaphors culturally neutral?" }, { t: "Check language complexity", d: "Readability estimated. Jargon flagged for non-technical personas." }, { t: "Score 12 criteria", d: "id_score, exclusion_patterns[], improvements[]." }], outputs: ["id_score /10", "exclusion_patterns[]", "language_complexity_score"] },
  { value: "learnability", n: "20", icon: "ti-school", title: "Learnability & Onboarding", desc: "Simulates first-time user and measures time to first success.", category: "behavioral", step: "eval", weight: 1.0, tags: ["first use", "onboarding", "productivity"], focus: "first-time learnability — steps to first success and onboarding support", formula: "L = 10-(steps_to_success/benchmark-1)×5\nBenchmark: simple=5, complex=12\nBonus: +0.5 per onboarding element", steps: [{ t: "Set first-time state", d: "Persona set to zero prior knowledge of this UI." }, { t: "Navigate to first success", d: "Persona attempts the primary task for the first time." }, { t: "Count steps", d: "Including wrong turns before successful completion." }, { t: "Check onboarding support", d: "Tooltips, empty states, contextual help, progress indicators?" }, { t: "Score learnability", d: "Fewer steps + better onboarding = higher L_score." }], outputs: ["l_score /10", "steps_to_first_success", "onboarding_support_quality"] },
];

/** Composite UX score (0-100) from selected method results using their weights (spec v3 §10). */
export function compositeUxScore(scores: { value: string; score10: number }[]): number {
  let weighted = 0;
  let weights = 0;
  for (const s of scores) {
    const def = TESTING_METHODS.find((m) => m.value === s.value);
    const w = def?.weight ?? 1;
    weighted += s.score10 * w;
    weights += w;
  }
  return weights ? Math.round((weighted / weights) * 10 * 10) / 10 : 0;
}

export const METHOD_CATEGORIES: { value: MethodCategory | "all"; label: string }[] = [
  { value: "all", label: "All 20" },
  { value: "heuristic", label: "Heuristic" },
  { value: "behavioral", label: "Behavioural" },
  { value: "cognitive", label: "Cognitive" },
  { value: "task", label: "Task-based" },
  { value: "accessibility", label: "Accessibility" },
  { value: "emotional", label: "Emotional" },
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
