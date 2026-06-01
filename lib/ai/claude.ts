// Claude wrapper — persona generation, synthetic testing, and KPI inference (spec §2, §5).
// Real Anthropic SDK call when ANTHROPIC_API_KEY is set; deterministic mock otherwise.
import { hasAnthropic } from "@/lib/config";
import { isServiceEnabled } from "@/lib/db";
import { extractJson } from "@/lib/ai/json";
import { personaGenerationPrompt } from "@/lib/prompts/personaGeneration";
import { syntheticTestingPrompt } from "@/lib/prompts/syntheticTesting";
import { kpiInferencePrompt } from "@/lib/prompts/kpiInference";
import type { GeneratedPersona } from "@/types/persona";
import type { KPIGenerationResult } from "@/types/kpi";

const MODEL = "claude-sonnet-4-20250514";

async function complete(prompt: string): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

// ── Persona generation ──────────────────────────────────────────────────────────
export async function generatePersonas(params: {
  count: number;
  flowDescription: string;
  productType: string;
  demographics: string;
  traits: string;
  techComfort: string;
}): Promise<GeneratedPersona[]> {
  if (!hasAnthropic || !isServiceEnabled("claude")) return mockPersonas(params.count, params.traits);
  const text = await complete(personaGenerationPrompt(params));
  return extractJson<GeneratedPersona[]>(text);
}

// ── Synthetic usability testing ──────────────────────────────────────────────────
export interface SyntheticTestRaw {
  task_success_rate: number;
  estimated_time_to_task: string;
  friction_points: {
    screen_sequence: number;
    description: string;
    severity: "low" | "medium" | "high";
    reason: string;
  }[];
  error_likelihood: "low" | "medium" | "high";
  confidence_level: number;
  persona_reaction: string;
  overall_score: number;
}

export async function runSyntheticTest(params: {
  personaJson: string;
  personaName: string;
  flowType: "before" | "after";
  flowDescription: string;
  keyChanges: string;
}): Promise<SyntheticTestRaw> {
  if (!hasAnthropic || !isServiceEnabled("claude")) return mockTest(params.flowType);
  const text = await complete(syntheticTestingPrompt(params));
  return extractJson<SyntheticTestRaw>(text);
}

// ── KPI matrix ───────────────────────────────────────────────────────────────────
export async function generateKpiMatrix(params: {
  analysisJson: string;
  testResultsJson: string;
  personasJson: string;
  industryContext: string;
  personaNames: string[];
}): Promise<KPIGenerationResult> {
  if (!hasAnthropic || !isServiceEnabled("claude")) return mockKpis(params.personaNames);
  const text = await complete(kpiInferencePrompt(params));
  return extractJson<KPIGenerationResult>(text);
}

// ── Mocks ──────────────────────────────────────────────────────────────────────
function mockPersonas(count: number, traits: string): GeneratedPersona[] {
  const base: GeneratedPersona[] = [
    {
      name: "Priya Nair",
      age: 34,
      gender: "female",
      occupation: "Operations Analyst",
      experience_years: 8,
      tech_comfort: "high",
      behavioral_traits: ["Detail-oriented", "Power user"],
      primary_goal: "Process records as fast as possible",
      key_frustration: "Too many confirmation steps",
      mental_model: "Expects keyboard shortcuts and bulk actions",
      accessibility_needs: "None",
      device_preference: "Desktop",
    },
    {
      name: "Marcus Bell",
      age: 51,
      gender: "male",
      occupation: "Field Technician",
      experience_years: 20,
      tech_comfort: "low",
      behavioral_traits: ["Impatient", "Accessibility needs"],
      primary_goal: "Log a job from the field quickly",
      key_frustration: "Small tap targets on mobile",
      mental_model: "Thinks in physical paperwork steps",
      accessibility_needs: "Larger text, high contrast",
      device_preference: "Mobile",
    },
    {
      name: "Sofia Castillo",
      age: 27,
      gender: "female",
      occupation: "Customer Success Rep",
      experience_years: 3,
      tech_comfort: "medium",
      behavioral_traits: ["Risk-averse", "Detail-oriented"],
      primary_goal: "Avoid mistakes when updating accounts",
      key_frustration: "Unclear error messages",
      mental_model: "Follows guided flows step by step",
      accessibility_needs: "None",
      device_preference: "Laptop",
    },
    {
      name: "Daniel Okoye",
      age: 42,
      gender: "male",
      occupation: "Team Lead",
      experience_years: 15,
      tech_comfort: "high",
      behavioral_traits: ["Power user", "Impatient"],
      primary_goal: "Review and approve work in bulk",
      key_frustration: "Context switching between screens",
      mental_model: "Wants dashboards over wizards",
      accessibility_needs: "None",
      device_preference: "Desktop",
    },
    {
      name: "Hana Suzuki",
      age: 38,
      gender: "female",
      occupation: "Compliance Officer",
      experience_years: 11,
      tech_comfort: "medium",
      behavioral_traits: ["Risk-averse", "Detail-oriented"],
      primary_goal: "Ensure every step is auditable",
      key_frustration: "Hidden state and unsaved changes",
      mental_model: "Verifies before committing",
      accessibility_needs: "None",
      device_preference: "Desktop",
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

function mockTest(flowType: "before" | "after"): SyntheticTestRaw {
  const after = flowType === "after";
  return {
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
