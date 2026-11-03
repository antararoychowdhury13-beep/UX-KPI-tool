// SynthUX measured simulation engine.
//
// Replaces the "ask one model to estimate task_success_rate" pattern: instead of a
// single LLM opining a score, each persona is expanded into a panel of synthetic
// participants (behaviour profiles jittered around the persona), every participant
// walks the flow step-by-step through a stochastic behaviour model, and every
// reported number is MEASURED from those sessions — success rates are counts,
// confidence is a Wilson interval, severity comes from where failures actually
// concentrated. Deterministic per (persona, flow, method): same inputs, same panel,
// same numbers — which is what makes before/after deltas attributable to the design
// change rather than sampling noise.
//
// Reference implementation: the Python engine in the portfolio repo
// (synthux/backend — scoring.py & orchestrator.py); this is its TypeScript port
// adapted to abstract described flows (no live browser in this milestone).
import type {
  FrictionPoint,
  MethodFinding,
  Persona,
  SyntheticTestRaw,
  TaskScenarioResult,
  TestingMethod,
} from "@/types/persona";

// ── deterministic RNG ────────────────────────────────────────────────────────────

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

class RNG {
  private state: number;
  private spare: number | null = null;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  uniform(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  gauss(mu: number, sigma: number): number {
    if (this.spare !== null) {
      const s = this.spare;
      this.spare = null;
      return mu + sigma * s;
    }
    let u = 0, v = 0, s = 0;
    do {
      u = this.next() * 2 - 1;
      v = this.next() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const m = Math.sqrt((-2 * Math.log(s)) / s);
    this.spare = v * m;
    return mu + sigma * u * m;
  }
  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// ── behaviour profile: the persona → simulation bridge ──────────────────────────

export interface BehaviourProfile {
  digitalLiteracy: number;   // 0-1, from tech_comfort(_score)
  domainExpertise: number;   // 0-1, from experience_years / role_level
  patience: number;          // 0-1, willingness to keep trying
  helpSeeking: number;       // 0-1, opens help vs gives up
  hazardSensitivity: number; // >1 when an accessibility profile applies
}

export function deriveBehaviour(persona: Persona): BehaviourProfile {
  const literacy =
    typeof persona.tech_comfort_score === "number"
      ? clamp01(persona.tech_comfort_score / 10)
      : persona.tech_comfort === "high"
        ? 0.85
        : persona.tech_comfort === "medium"
          ? 0.55
          : 0.3;
  const years = persona.experience_years ?? 3;
  const senior = /senior|lead|principal|head|director/i.test(persona.role_level ?? "");
  const domain = clamp01(Math.min(years, 15) / 15 + (senior ? 0.15 : 0));
  const age = persona.age ?? 38;
  const patience = clamp01(0.65 - (age >= 55 ? 0.15 : 0) + literacy * 0.2);
  const helpSeeking = clamp01(0.85 - literacy * 0.5);
  const a11y = (persona.accessibility_profile ?? "").toLowerCase();
  const hazardSensitivity =
    a11y && a11y !== "none" ? (/(visual|screen reader|low vision)/.test(a11y) ? 1.5 : 1.25) : 1.0;
  return { digitalLiteracy: literacy, domainExpertise: domain, patience, helpSeeking, hazardSensitivity };
}

// ── flow hazard model ────────────────────────────────────────────────────────────

/** Hazards are the flow's difficulty parameters; outcomes are measured from
 * sessions run against them. The "after" flow earns hazard reductions from the
 * analysis's key_changes — more (and clearer) changes, lower hazards. */
export interface FlowHazards {
  optimalSteps: number;
  comprehension: number; // chance the critical label/copy is misread
  wrongTurn: number;     // per-step chance of entering the wrong area
  feedbackGap: number;   // chance of a silent "declared done but wasn't"
}

export function deriveHazards(flowType: "before" | "after", keyChanges: string[], screenCount: number): FlowHazards {
  const optimalSteps = Math.max(3, Math.min(8, screenCount || 4 + Math.min(2, keyChanges.length)));
  const base: FlowHazards = { optimalSteps, comprehension: 0.42, wrongTurn: 0.2, feedbackGap: 0.08 };
  if (flowType === "before") return base;
  const text = keyChanges.join(" ").toLowerCase();
  // A hazard is reduced ONLY when a documented change addresses it. A redesign
  // whose key changes are purely visual measures identical to the baseline —
  // improvement must be earned from evidence, never granted by default.
  const labelFix = /rename|label|word|copy|terminolog|clarif/.test(text) ? 0.55 : 0;
  const navFix = /nav|menu|reorganis|restructur|simplif|consolidat|flow/.test(text) ? 0.5 : 0;
  const fbFix = /feedback|confirm|toast|success|status/.test(text) ? 0.6 : 0;
  const strength = clamp01(keyChanges.length / 5); // more documented changes → fuller effect
  return {
    optimalSteps,
    comprehension: base.comprehension * (1 - labelFix * (0.5 + 0.5 * strength)),
    wrongTurn: base.wrongTurn * (1 - navFix * (0.5 + 0.5 * strength)),
    feedbackGap: base.feedbackGap * (1 - fbFix * (0.5 + 0.5 * strength)),
  };
}

// ── session simulation ───────────────────────────────────────────────────────────

export type Outcome = "success" | "partial" | "failure" | "abandoned";

export interface SimStep {
  index: number;
  phase: string;         // e.g. "step 3 of 5", "wrong turn", "help"
  said: string;
  confidence: number;
}

export interface SimSession {
  outcome: Outcome;
  actions: number;
  backtracks: number;
  trapHit: boolean;
  usedHelp: boolean;
  meanConfidence: number;
  steps: SimStep[];
}

const CONFUSED = [
  "I'm not sure what this option means.",
  "I expected this to be worded differently.",
  "This doesn't look like what I was trying to do.",
  "Maybe it's under a different section?",
];
const CONFIDENT = [
  "This looks like the right place.",
  "That's clearly what I need.",
  "Straightforward so far.",
];

function simulateSession(rng: RNG, b: BehaviourProfile, hz: FlowHazards): SimSession {
  const jitter = (x: number) => clamp01(rng.gauss(x, 0.12));
  const lit = jitter(b.digitalLiteracy);
  const dom = jitter(b.domainExpertise);
  const steps: SimStep[] = [];
  let actions = 0;
  let backtracks = 0;
  let trapHit = false;
  let usedHelp = false;
  const confs: number[] = [];
  const say = (phase: string, said: string, confidence: number) => {
    confs.push(confidence);
    steps.push({ index: steps.length, phase, said, confidence: Math.round(confidence * 100) / 100 });
  };
  const finish = (outcome: Outcome): SimSession => ({
    outcome,
    actions,
    backtracks,
    trapHit,
    usedHelp,
    meanConfidence: confs.length ? confs.reduce((a, c) => a + c, 0) / confs.length : 0,
    steps,
  });

  const trapStep = Math.max(2, Math.ceil(hz.optimalSteps * 0.6)); // the critical decision sits deep in the flow
  for (let step = 1; step <= hz.optimalSteps; step++) {
    actions++;
    // Wrong-area detour: low literacy raises it, sensitivity scales it.
    if (rng.next() < hz.wrongTurn * (1.3 - lit) * b.hazardSensitivity) {
      actions += 2;
      backtracks++;
      say(`step ${step}`, rng.choice(CONFUSED), rng.uniform(0.2, 0.45));
      if (rng.next() > 0.4 + b.patience * 0.5) return finish("abandoned");
    }
    // Comprehension trap at the critical step.
    if (step === trapStep && rng.next() < hz.comprehension * (1 - dom * 0.7) * b.hazardSensitivity) {
      trapHit = true;
      say(`step ${step}`, rng.choice(CONFUSED), rng.uniform(0.15, 0.35));
      actions += 2;
      backtracks++;
      if (rng.next() < b.helpSeeking) {
        usedHelp = true;
        actions += 3; // help round-trip, then recover
        say("help", "Let me check the help section.", rng.uniform(0.3, 0.5));
        if (rng.next() > 0.25 + lit * 0.6) return finish("abandoned");
        say(`step ${step}`, "So that WAS the right option after all.", rng.uniform(0.5, 0.7));
      } else if (rng.next() > b.patience) {
        return finish("abandoned");
      }
    } else {
      say(`step ${step}`, rng.choice(CONFIDENT), rng.uniform(0.55, 0.9));
    }
  }
  // Reached the end: silent failure risk (thought it worked, it didn't).
  if (rng.next() < hz.feedbackGap * (1.4 - lit)) return finish("failure");
  if (rng.next() < 0.06) return finish("partial");
  say("done", "Done — that's set up.", rng.uniform(0.7, 0.95));
  return finish("success");
}

// ── measurement ──────────────────────────────────────────────────────────────────

function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0];
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z / d) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Measured extras persisted inside raw_ai_response for UI drill-downs. */
export const ENGINE_VERSION = "synthux-engine/2.1";

export interface SynthuxMeasured {
  engine: "synthux-measured";
  /** Hash of every input that shaped this result; identical inputs reproduce it. */
  input_fingerprint: string;
  engine_version: string;
  /** False whenever the run was driven by described flows rather than inspected pixels. */
  pixels_inspected: boolean;
  participants: number;
  outcomes: Record<Outcome, number>;
  success_ci: [number, number];
  median_actions: number;
  optimal_actions: number;
  backtrack_rate: number;
  help_rate: number;
  trap_hit_rate: number;
  representative_transcript: SimStep[];
}

export interface MeasuredTestParams {
  persona: Persona;
  flowType: "before" | "after";
  keyChanges: string[];
  method?: TestingMethod;
  screenCount?: number;
  participants?: number; // panel size expanded from this persona (default 12)
}

/** Everything that may legitimately change a result, in canonical order. Seeding from
 *  this (rather than a database id) means identical inputs reproduce identical numbers,
 *  and any real change to the test moves them. */
export function studyFingerprint(params: MeasuredTestParams): string {
  const p = params.persona;
  return [
    ENGINE_VERSION,
    params.flowType,
    params.method ?? "heuristic",
    `n:${params.participants ?? 12}`,
    `screens:${params.screenCount ?? 0}`,
    `persona:${[p.name, p.age, p.tech_comfort, p.tech_comfort_score, p.experience_years,
                p.role_level, p.accessibility_profile].join("/")}`,
    `changes:${[...(params.keyChanges ?? [])].join("|")}`,
  ].join("||");
}

export function runMeasuredTest(params: MeasuredTestParams): SyntheticTestRaw & { synthux: SynthuxMeasured } {
  const method: TestingMethod = params.method ?? "heuristic";
  const n = params.participants ?? 12;
  const behaviour = deriveBehaviour(params.persona);
  const hazards = deriveHazards(params.flowType, params.keyChanges, params.screenCount ?? 0);
  const fingerprint = hashSeed(studyFingerprint(params));
  const rng = new RNG(fingerprint);

  const sessions: SimSession[] = [];
  for (let i = 0; i < n; i++) sessions.push(simulateSession(rng, behaviour, hazards));

  const count = (o: Outcome) => sessions.filter((s) => s.outcome === o).length;
  const successes = count("success");
  const rate = successes / n;
  const ci = wilson(successes, n);
  const actions = sessions.map((s) => s.actions);
  const backtrackRate = sessions.filter((s) => s.backtracks > 0).length / n;
  const trapRate = sessions.filter((s) => s.trapHit).length / n;
  const helpRate = sessions.filter((s) => s.usedHelp).length / n;
  const abandoned = count("abandoned");
  const blockedShare = (abandoned + count("failure")) / n;

  // Friction points from where sessions actually struggled — measured, not opined.
  const trapStep = Math.max(2, Math.ceil(hazards.optimalSteps * 0.6));
  const frictionPoints: FrictionPoint[] = [];
  if (trapRate > 0.05) {
    frictionPoints.push({
      screen_sequence: trapStep,
      description: `Critical option at step ${trapStep} was misread by ${Math.round(trapRate * 100)}% of the panel`,
      severity: trapRate > 0.35 ? "high" : trapRate > 0.15 ? "medium" : "low",
      reason: `${Math.round(trapRate * n)}/${n} participants backed out of the correct option; ${Math.round(
        helpRate * 100,
      )}% needed Help to recover`,
    });
  }
  if (backtrackRate > 0.25) {
    frictionPoints.push({
      screen_sequence: 1,
      description: `Navigation uncertainty: ${Math.round(backtrackRate * 100)}% of sessions backtracked at least once`,
      severity: backtrackRate > 0.55 ? "high" : "medium",
      reason: "Wrong-area detours before locating the correct section",
    });
  }
  if (abandoned / n > 0.1) {
    frictionPoints.push({
      screen_sequence: trapStep,
      description: `${Math.round((abandoned / n) * 100)}% of the panel gave up before completing the task`,
      severity: abandoned / n > 0.3 ? "high" : "medium",
      reason: "Confidence collapsed after repeated misses; participants preferred to seek human support",
    });
  }

  // Representative transcript: the session whose outcome matches the panel majority.
  const majority: Outcome = (Object.entries({
    success: successes,
    partial: count("partial"),
    failure: count("failure"),
    abandoned,
  }).sort((a, b) => b[1] - a[1])[0][0] ?? "success") as Outcome;
  const representative = sessions.find((s) => s.outcome === majority) ?? sessions[0];

  const meanConfidence = sessions.reduce((a, s) => a + s.meanConfidence, 0) / n;
  // Measured composite (0-10): completion, efficiency, and confidence — no model opinion.
  const efficiency = Math.min(1, hazards.optimalSteps / Math.max(1, median(actions)));
  const overall = Math.round((rate * 0.6 + efficiency * 0.2 + meanConfidence * 0.2) * 100) / 10;

  const synthux: SynthuxMeasured = {
    engine: "synthux-measured",
    input_fingerprint: fingerprint.toString(16).padStart(8, "0"),
    engine_version: ENGINE_VERSION,
    pixels_inspected: false,
    participants: n,
    outcomes: { success: successes, partial: count("partial"), failure: count("failure"), abandoned },
    success_ci: [Math.round(ci[0] * 1000) / 1000, Math.round(ci[1] * 1000) / 1000],
    median_actions: median(actions),
    optimal_actions: hazards.optimalSteps,
    backtrack_rate: Math.round(backtrackRate * 1000) / 1000,
    help_rate: Math.round(helpRate * 1000) / 1000,
    trap_hit_rate: Math.round(trapRate * 1000) / 1000,
    representative_transcript: representative.steps,
  };

  const raw: SyntheticTestRaw & { synthux: SynthuxMeasured } = {
    testing_method: method,
    task_success_rate: Math.round(rate * 1000) / 1000,
    estimated_time_to_task: `${Math.round(median(actions) * 0.4)}–${Math.round(median(actions) * 0.9)} min`,
    friction_points: frictionPoints,
    error_likelihood: blockedShare > 0.3 ? "high" : blockedShare > 0.12 ? "medium" : "low",
    confidence_level: Math.round((1 - (ci[1] - ci[0])) * 100) / 100, // narrow CI → high confidence
    persona_reaction:
      representative.steps.find((s) => s.confidence < 0.4)?.said ??
      representative.steps[representative.steps.length - 1]?.said ??
      "Completed without notable friction.",
    overall_score: overall,
    synthux,
  };

  // Method-specific views derived from the SAME measured sessions.
  if (method === "think_aloud") {
    raw.think_aloud_transcript = representative.steps
      .map((s) => `[${s.phase}] "${s.said}" (confidence ${Math.round(s.confidence * 100)}%)`)
      .join("\n");
    raw.key_quotes = [...new Set(sessions.flatMap((s) => s.steps.filter((x) => x.confidence < 0.4).map((x) => x.said)))].slice(0, 3);
    raw.emotional_arc =
      majority === "success" ? (trapRate > 0.2 ? "frustrated-to-confident" : "smooth") : "confused-throughout";
  } else if (method === "task_scenario") {
    // Split the panel into task groups so every scenario row is still measured.
    const groups = 5;
    const scenarios: TaskScenarioResult[] = [];
    for (let g = 0; g < groups; g++) {
      const slice = sessions.filter((_, i) => i % groups === g);
      if (!slice.length) continue;
      const ok = slice.filter((s) => s.outcome === "success").length;
      scenarios.push({
        task_name: `Task variant ${g + 1}`,
        success: ok / slice.length >= 0.5,
        steps_taken: Math.round(median(slice.map((s) => s.actions))),
        expected_steps: hazards.optimalSteps,
        deviation_reason: slice.some((s) => s.trapHit) ? "critical-option comprehension miss" : undefined,
        severity: ok / slice.length < 0.5 ? "high" : ok / slice.length < 1 ? "medium" : "na",
      } as TaskScenarioResult);
    }
    raw.task_scenarios_result = scenarios;
  } else if (method !== "heuristic") {
    const findings: MethodFinding[] = frictionPoints.map((f) => ({
      title: f.description.slice(0, 60),
      severity: f.severity,
      description: f.reason,
      recommendation: undefined,
    }));
    if (!findings.length)
      findings.push({
        title: "No measured friction in this panel",
        severity: "positive",
        description: `${successes}/${n} participants completed the flow near the optimal path.`,
      });
    raw.findings = findings;
  }
  return raw;
}
