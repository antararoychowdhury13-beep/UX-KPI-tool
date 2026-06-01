// Text-LLM tasks — persona generation, synthetic testing, KPI inference (spec §2, §5).
// Runs against the active provider (Claude / Qwen / Ollama via lib/ai/providers); falls back to
// deterministic mock output when no provider is configured OR when the provider returns
// unparseable JSON (small local models can be flaky, so we degrade gracefully).
import { generateText } from "@/lib/ai/providers";
import { extractJson } from "@/lib/ai/json";
import { personaGenerationPrompt } from "@/lib/prompts/personaGeneration";
import { heuristicWalkthroughPrompt } from "@/lib/prompts/heuristicWalkthrough";
import { taskScenarioTestingPrompt } from "@/lib/prompts/taskScenarioTesting";
import { thinkAloudSimulationPrompt } from "@/lib/prompts/thinkAloudSimulation";
import { cognitiveLoadMappingPrompt } from "@/lib/prompts/cognitiveLoadMapping";
import { genericMethodPrompt } from "@/lib/prompts/genericMethod";
import { flowContextAnalysisPrompt } from "@/lib/prompts/flowContextAnalysis";
import { kpiInferencePrompt } from "@/lib/prompts/kpiInference";
import { TESTING_METHODS, type GeneratedPersona, type SyntheticTestRaw, type TestingMethod } from "@/types/persona";
import type { FlowContext } from "@/types/flow";
import type { KPIGenerationResult } from "@/types/kpi";

/** Run the active provider and parse JSON; return null to signal "use the mock". */
async function generateJson<T>(prompt: string): Promise<T | null> {
  const text = await generateText(prompt);
  if (text == null) return null; // no provider configured/enabled
  try {
    return extractJson<T>(text);
  } catch {
    return null; // provider returned unparseable output — degrade to mock
  }
}

// ── Flow context analysis ─────────────────────────────────────────────────────────
export async function analyzeFlowContext(params: {
  flowDescription: string;
  flowType: string;
  industry: string;
}): Promise<FlowContext> {
  const parsed = await generateJson<FlowContext>(flowContextAnalysisPrompt(params));
  return parsed && typeof parsed.flow_summary === "string" && parsed.flow_summary.length
    ? parsed
    : mockFlowContext(params);
}

// ── Persona generation ──────────────────────────────────────────────────────────
export async function generatePersonas(params: {
  count: number;
  flowDescription: string;
  productType: string;
  industry?: string;
  flowContext?: string;
  ageRanges: string;
  genders?: string;
  roleLevels?: string;
  techComfort: string;
  accessibility?: string;
  traits: string;
}): Promise<GeneratedPersona[]> {
  const parsed = await generateJson<unknown>(personaGenerationPrompt(params));
  // Accept an array, a common wrapper ({personas|data|items|results: [...]}), or a single object.
  const arr = normalizePersonaList(parsed);
  return arr.length ? arr : mockPersonas(params.count, params.traits);
}

function normalizePersonaList(parsed: unknown): GeneratedPersona[] {
  if (Array.isArray(parsed)) return parsed as GeneratedPersona[];
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    for (const key of ["personas", "data", "items", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as GeneratedPersona[];
    }
    if (typeof obj.name === "string") return [parsed as GeneratedPersona];
  }
  return [];
}

// ── Synthetic usability testing ──────────────────────────────────────────────────
type PromptParams = { personaJson: string; flowType: "before" | "after"; flowDescription: string; keyChanges: string };
const SPECIAL_PROMPTS: Record<string, (p: PromptParams) => string> = {
  heuristic: heuristicWalkthroughPrompt,
  task_scenario: taskScenarioTestingPrompt,
  think_aloud: thinkAloudSimulationPrompt,
  cognitive_load: cognitiveLoadMappingPrompt,
};

export async function runSyntheticTest(params: {
  personaJson: string;
  personaName: string;
  flowType: "before" | "after";
  flowDescription: string;
  keyChanges: string;
  method?: TestingMethod;
}): Promise<SyntheticTestRaw> {
  const method: TestingMethod = params.method ?? "heuristic";
  // Bespoke prompt for the original four methods; generic focus-driven prompt for the rest.
  const builder = SPECIAL_PROMPTS[method];
  const def = TESTING_METHODS.find((m) => m.value === method);
  const prompt = builder
    ? builder(params)
    : genericMethodPrompt({ ...params, methodTitle: def?.title ?? method, focus: def?.focus ?? "overall usability" });
  const result = await generateJson<SyntheticTestRaw>(prompt);
  const raw = result && typeof result.task_success_rate === "number" ? result : mockTest(params.flowType, method);
  // Stamp the method so the UI knows which method-specific view to render.
  return { ...raw, testing_method: method };
}

// ── KPI matrix ───────────────────────────────────────────────────────────────────
export async function generateKpiMatrix(params: {
  analysisJson: string;
  testResultsJson: string;
  personasJson: string;
  industryContext: string;
  personaNames: string[];
}): Promise<KPIGenerationResult> {
  const result = await generateJson<KPIGenerationResult>(kpiInferencePrompt(params));
  return result && Array.isArray(result.kpis) && result.kpis.length >= 1
    ? result
    : mockKpis(params.personaNames);
}

// ── Mocks ──────────────────────────────────────────────────────────────────────
function mockFlowContext(params: { flowDescription: string; flowType: string; industry: string }): FlowContext {
  const flow = params.flowType || "this flow";
  return {
    flow_summary: `A ${flow} experience in ${params.industry || "enterprise software"}. ${
      params.flowDescription
        ? "Personas are tuned to the described workflow and its primary pain points."
        : "Add a flow description for sharper, more relevant personas."
    }`,
    user_environment: "Primarily desktop, in-office or hybrid, often under time pressure with competing tasks.",
    primary_user_archetype: "Experienced operator with deep muscle memory for the legacy workflow.",
    recommended_role_levels: ["mid", "senior", "manager"],
    recommended_tech_comfort: ["intermediate", "advanced", "expert"],
    recommended_age_ranges: ["36-45", "46-55"],
    recommended_behavioral_traits: ["Detail-oriented", "Power user", "Risk-averse", "Enterprise admin"],
    accessibility_considerations:
      "Include at least one persona with elevated cognitive load or visual-contrast needs.",
    key_tensions: [
      "Users have deep muscle memory with the old system",
      "A redesign creates change anxiety and relearning cost",
    ],
    persona_diversity_note:
      "Vary tenure, tech comfort, and risk tolerance so the test surfaces both power-user and novice friction.",
  };
}

function mockPersonas(count: number, traits: string): GeneratedPersona[] {
  const base: GeneratedPersona[] = [
    {
      name: "Priya Nair",
      age: 34,
      age_range: "26-35",
      gender: "female",
      occupation: "Operations Analyst",
      occupation_detail: "Bulk records processing, enterprise ops",
      role_level: "senior",
      location: "Bangalore, India",
      experience_years: 8,
      tech_comfort: "high",
      tech_comfort_score: 9,
      behavioral_traits: ["Detail-oriented", "Power user", "Keyboard-first"],
      primary_goal: "Process records as fast as possible",
      key_frustration: "Too many confirmation steps",
      motivation_quote: "I run hundreds of records a day — every extra click is wasted time.",
      mental_model: "Expects keyboard shortcuts and bulk actions",
      accessibility_profile: "none",
      device_preference: "desktop",
    },
    {
      name: "Marcus Bell",
      age: 51,
      age_range: "46-55",
      gender: "male",
      occupation: "Field Technician",
      occupation_detail: "On-site equipment servicing",
      role_level: "mid",
      location: "Manchester, UK",
      experience_years: 20,
      tech_comfort: "low",
      tech_comfort_score: 3,
      behavioral_traits: ["Impatient", "Mobile-first"],
      primary_goal: "Log a job from the field quickly",
      key_frustration: "Small tap targets on mobile",
      motivation_quote: "I'm on a ladder half the time — I need big buttons and no fuss.",
      mental_model: "Thinks in physical paperwork steps",
      accessibility_profile: "motor_difficulty",
      device_preference: "mobile",
    },
    {
      name: "Sofia Castillo",
      age: 27,
      age_range: "26-35",
      gender: "female",
      occupation: "Customer Success Rep",
      occupation_detail: "Account updates and support",
      role_level: "junior",
      location: "Austin, USA",
      experience_years: 3,
      tech_comfort: "medium",
      tech_comfort_score: 6,
      behavioral_traits: ["Risk-averse", "Detail-oriented", "Procedure-follower"],
      primary_goal: "Avoid mistakes when updating accounts",
      key_frustration: "Unclear error messages",
      motivation_quote: "I'd rather go slow than break a customer's account.",
      mental_model: "Follows guided flows step by step",
      accessibility_profile: "none",
      device_preference: "laptop",
    },
    {
      name: "Daniel Okoye",
      age: 42,
      age_range: "36-45",
      gender: "male",
      occupation: "Team Lead",
      occupation_detail: "Reviews and approvals across the team",
      role_level: "lead",
      location: "Lagos, Nigeria",
      experience_years: 15,
      tech_comfort: "high",
      tech_comfort_score: 8,
      behavioral_traits: ["Power user", "Impatient", "Multi-tasker"],
      primary_goal: "Review and approve work in bulk",
      key_frustration: "Context switching between screens",
      motivation_quote: "Give me one screen to approve everything — stop making me jump around.",
      mental_model: "Wants dashboards over wizards",
      accessibility_profile: "none",
      device_preference: "multi_monitor",
    },
    {
      name: "Hana Suzuki",
      age: 38,
      age_range: "36-45",
      gender: "female",
      occupation: "Compliance Officer",
      occupation_detail: "Audit and regulatory sign-off",
      role_level: "manager",
      location: "Tokyo, Japan",
      experience_years: 11,
      tech_comfort: "medium",
      tech_comfort_score: 6,
      behavioral_traits: ["Risk-averse", "Detail-oriented", "Enterprise admin"],
      primary_goal: "Ensure every step is auditable",
      key_frustration: "Hidden state and unsaved changes",
      motivation_quote: "If I can't see the audit trail, I can't sign off — full stop.",
      mental_model: "Verifies before committing",
      accessibility_profile: "none",
      device_preference: "desktop",
    },
  ];
  const traitList = traits
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
  return base.slice(0, Math.max(1, Math.min(count, base.length))).map((p) =>
    traitList.length
      ? { ...p, behavioral_traits: Array.from(new Set([...p.behavioral_traits, ...traitList])) }
      : p,
  );
}

function mockTest(flowType: "before" | "after", method: TestingMethod = "heuristic"): SyntheticTestRaw {
  const after = flowType === "after";
  const base: SyntheticTestRaw = {
    testing_method: method,
    task_success_rate: after ? 0.86 : 0.62,
    estimated_time_to_task: after ? "48s" : "1m 35s",
    friction_points: after
      ? [
          {
            screen_sequence: 2,
            description: "Primary action could be more prominent",
            severity: "low",
            reason: "Button competes with secondary link",
          },
        ]
      : [
          {
            screen_sequence: 1,
            description: "Required fields not clearly marked",
            severity: "high",
            reason: "Validation only fires on submit",
          },
          {
            screen_sequence: 3,
            description: "Multi-step flow loses context",
            severity: "medium",
            reason: "No progress indicator",
          },
        ],
    error_likelihood: after ? "low" : "high",
    confidence_level: 0.8,
    persona_reaction: after
      ? "The streamlined flow felt faster and clearer."
      : "I wasn't sure which fields were required and got stuck.",
    overall_score: after ? 8.4 : 5.6,
  };

  if (method === "heuristic") {
    const s = (hi: number, lo: number) => (after ? hi : lo);
    base.heuristic_scores = {
      visibility_of_system_status: s(8, 5),
      match_real_world: s(8, 6),
      user_control_freedom: s(7, 5),
      consistency_standards: s(9, 6),
      error_prevention: s(8, 4),
      recognition_over_recall: s(8, 5),
      flexibility_efficiency: s(7, 5),
      aesthetic_minimalist: s(9, 6),
      error_recovery: s(7, 4),
      help_documentation: s(6, 5),
    };
  } else if (method === "task_scenario") {
    base.task_scenarios_result = [
      { task_name: "Locate the primary action", task_description: "Find and start the main task", success: true, steps_taken: after ? 2 : 4, expected_steps: 2, completion_time_estimate: after ? "12s" : "31s", deviation_reason: after ? "" : "Hunted through nested menus", severity: after ? "na" : "medium" },
      { task_name: "Complete required fields", task_description: "Fill and validate the form", success: after, steps_taken: after ? 3 : 6, expected_steps: 3, completion_time_estimate: after ? "20s" : "55s", deviation_reason: after ? "" : "Unclear which fields were required", severity: after ? "na" : "high" },
      { task_name: "Confirm and submit", task_description: "Review then submit", success: true, steps_taken: after ? 1 : 2, expected_steps: 1, completion_time_estimate: after ? "8s" : "16s", deviation_reason: after ? "" : "No summary before submit", severity: after ? "na" : "low" },
    ];
  } else if (method === "think_aloud") {
    base.think_aloud_transcript = after
      ? "Okay, the layout is clear right away. The main action is the first thing I see, so I'll click that… good, the form only asks for what it needs, and the required fields are obvious. Submitting now — and there's a clear confirmation. That was quick and I never felt lost."
      : "Hmm, where do I start? There are a lot of options up top… let me try this menu. No, that's not it. Okay, found the form, but I'm not sure which of these fields I actually have to fill in. I'll just submit and see — oh, now it's showing errors I didn't expect. This is frustrating.";
    base.key_quotes = after
      ? ["The main action is the first thing I see", "I never felt lost"]
      : ["Where do I start?", "I'm not sure which fields I have to fill in"];
    base.emotional_arc = after ? "smooth_experience" : "frustrated_start_to_confident_end";
  } else if (method === "cognitive_load") {
    base.cognitive_load_map = [
      { screen_sequence: 1, screen_label: "Entry", load_score: after ? 3 : 6, peak_areas: ["Top navigation"], load_type: "extraneous", reason: after ? "Clear entry point" : "Too many competing options", reduction_opportunity: "Surface the primary path" },
      { screen_sequence: 2, screen_label: "Form", load_score: after ? 4 : 8, peak_areas: ["Field validation", "Labels"], load_type: "intrinsic", reason: after ? "Inline guidance" : "Unlabelled required fields", reduction_opportunity: "Mark required fields and validate inline" },
      { screen_sequence: 3, screen_label: "Confirm", load_score: after ? 2 : 5, peak_areas: ["Summary"], load_type: "germane", reason: after ? "Clear summary" : "No review step", reduction_opportunity: "Add a confirmation summary" },
    ];
    base.average_cognitive_load = after ? 3 : 6.3;
    base.peak_load_screen = 2;
  } else {
    // Generic methods (first-click, accessibility, trust, etc.)
    base.findings = after
      ? [
          { title: "Clear primary path", severity: "positive", description: "The redesign makes the main action and next step obvious for this lens." },
          { title: "Minor polish opportunity", severity: "low", description: "A secondary cue could be slightly stronger.", recommendation: "Increase contrast/spacing on the secondary affordance." },
        ]
      : [
          { title: "Ambiguous entry point", severity: "high", description: "The persona is unsure where to start for this lens.", recommendation: "Surface the primary path and de-emphasise competing options." },
          { title: "Weak feedback", severity: "medium", description: "State changes are not clearly communicated.", recommendation: "Add inline feedback at the point of action." },
        ];
  }
  return base;
}

function mockKpis(personaNames: string[]): KPIGenerationResult {
  const names = personaNames.length ? personaNames : ["Enterprise Analyst"];
  const k = (
    name: string,
    category: KPIGenerationResult["kpis"][number]["category"],
    before: number,
    after: number,
    confidence_level: "low" | "medium" | "high",
    confidence_score: number,
    reasoning: string,
    measurement_method: string,
    ux_principle: string,
  ): KPIGenerationResult["kpis"][number] => ({
    name,
    category,
    before_score: before,
    after_score: after,
    delta: after - before,
    delta_direction:
      after > before ? "improvement" : after < before ? "regression" : "neutral",
    confidence_level,
    confidence_score,
    reasoning,
    measurement_method,
    ux_principle,
    persona_impact: names,
  });

  return {
    overall_confidence: 0.84,
    ux_score_before: 58,
    ux_score_after: 82,
    kpis: [
      k(
        "Task Completion Rate",
        "efficiency",
        62,
        84,
        "high",
        0.87,
        "The new design reduces form steps from 5 to 2 and surfaces required fields inline, lowering drop-off.",
        "Track form submit success events post-launch",
        "Reducing cognitive load improves completion",
      ),
      k(
        "Time on Task",
        "efficiency",
        58,
        80,
        "high",
        0.83,
        "Consolidated screens cut navigation between steps.",
        "Measure median time from flow start to success event",
        "Fewer steps reduce time to value",
      ),
      k(
        "Error Rate",
        "error_reduction",
        45,
        78,
        "medium",
        0.76,
        "Inline validation prevents invalid submissions earlier.",
        "Count validation errors per session",
        "Prevent errors before they happen",
      ),
      k(
        "Perceived Ease of Use",
        "satisfaction",
        60,
        82,
        "medium",
        0.74,
        "Clearer hierarchy and progress cues raised confidence in synthetic tests.",
        "Post-task SEQ (Single Ease Question) survey",
        "Clarity builds trust",
      ),
      k(
        "Accessibility Compliance",
        "accessibility",
        55,
        79,
        "medium",
        0.7,
        "Larger tap targets and higher contrast benefit low-vision and mobile users.",
        "Automated axe-core audit + manual checks",
        "Inclusive design widens reach",
      ),
      k(
        "Learnability",
        "learnability",
        57,
        81,
        "medium",
        0.72,
        "Guided, linear flow reduces first-use confusion.",
        "First-time-user success rate vs returning users",
        "Recognition over recall",
      ),
    ],
    top_3_improvements: [
      "Task completion rate up 22 points",
      "Error rate cut by a third",
      "Time on task reduced for power users and novices alike",
    ],
    risks_and_regressions: [
      "Primary CTA prominence could be improved to avoid minor hesitation",
    ],
    post_launch_tracking_plan:
      "Instrument funnel events for the flow, run a 2-week A/B against the legacy design, and collect SEQ after task completion.",
  };
}
