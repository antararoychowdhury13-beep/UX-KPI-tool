// Data access layer. Currently backed by an in-memory store for local/mock mode (spec: mock-first).
// When Supabase is configured, swap these functions for queries via lib/supabase/server.ts —
// the call sites (API routes, server components) depend only on this interface.
//
// NOTE: the in-memory store lives on globalThis so it survives Next.js HMR in dev. It does NOT
// persist across server restarts and is single-process only — adequate for local demos, not prod.

import { uuid, now, shareToken } from "@/lib/utils/ids";
import type {
  Analysis,
  AnalysisStatus,
  FlowDiff,
  Project,
  ProjectStatus,
  Screenshot,
  ScreenshotType,
  User,
} from "@/types/project";
import type { Persona } from "@/types/persona";
import type { SyntheticTestResult } from "@/types/persona";
import type { KPI, KPIMatrix } from "@/types/kpi";
import type { AnnotationMap, Report, ApiUsageLog, ApiService, ApiCallStatus, AIService } from "@/types/report";

export interface AnalysisJob {
  id: string;
  project_id: string;
  status: AnalysisStatus;
  analysis_id: string | null;
  error: string | null;
  created_at: string;
}

interface Store {
  users: Map<string, User>;
  projects: Map<string, Project>;
  screenshots: Map<string, Screenshot>;
  analyses: Map<string, Analysis>;
  personas: Map<string, Persona>;
  kpiMatrices: Map<string, KPIMatrix>;
  testResults: Map<string, SyntheticTestResult>;
  reports: Map<string, Report>;
  jobs: Map<string, AnalysisJob>;
  apiUsage: ApiUsageLog[];
  aiServices: Map<string, AIService>;
}

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

function seed(): Store {
  const store: Store = {
    users: new Map(),
    projects: new Map(),
    screenshots: new Map(),
    analyses: new Map(),
    personas: new Map(),
    kpiMatrices: new Map(),
    testResults: new Map(),
    reports: new Map(),
    jobs: new Map(),
    apiUsage: [],
    aiServices: new Map(),
  };

  const builtinServices: Array<Omit<AIService, "id" | "created_at">> = [
    { name: "Anthropic Claude", slug: "claude", role: "Personas · testing · KPIs", provider: "anthropic", model: "claude-sonnet-4-20250514", env_var: "ANTHROPIC_API_KEY", enabled: true, builtin: true },
    { name: "Google Gemini", slug: "gemini", role: "Screenshot vision analysis", provider: "google", model: "gemini-1.5-flash", env_var: "GOOGLE_GEMINI_API_KEY", enabled: true, builtin: true },
    { name: "HuggingFace", slug: "huggingface", role: "Image similarity (fallback)", provider: "huggingface", model: null, env_var: "HUGGINGFACE_API_KEY", enabled: true, builtin: true },
    { name: "Qwen", slug: "qwen", role: "Alternate persona / KPI generation", provider: "alibaba", model: "qwen2.5-72b-instruct", env_var: "QWEN_API_KEY", enabled: true, builtin: true },
    { name: "Ollama (local)", slug: "ollama", role: "Local LLM inference", provider: "ollama", model: "llama3.1", env_var: "OLLAMA_BASE_URL", enabled: true, builtin: true },
  ];
  for (const s of builtinServices) {
    const id = uuid();
    store.aiServices.set(id, { id, created_at: now(), ...s });
  }

  store.users.set(MOCK_USER_ID, {
    id: MOCK_USER_ID,
    email: "demo@uxkpi.local",
    full_name: "Anupam Sarkar",
    role: "admin",
    quota_analyses: 10,
    quota_used: 0,
    created_at: now(),
    updated_at: now(),
  });

  // A couple of global template personas (admin-created, available to everyone).
  const templates: Array<Partial<Persona> & { name: string }> = [
    {
      name: "Enterprise Analyst",
      occupation: "Data Analyst",
      tech_comfort: "high",
      behavioral_traits: ["Detail-oriented", "Power user"],
      goals: "Complete tasks quickly with minimal clicks",
      frustrations: "Hidden actions and unnecessary confirmation dialogs",
    },
    {
      name: "Field Technician",
      occupation: "Maintenance Technician",
      tech_comfort: "low",
      behavioral_traits: ["Impatient", "Accessibility needs"],
      goals: "Get in, log the job, get out",
      frustrations: "Tiny tap targets and dense forms on mobile",
    },
  ];
  for (const t of templates) {
    const id = uuid();
    store.personas.set(id, {
      id,
      user_id: MOCK_USER_ID,
      project_id: null,
      name: t.name,
      age_range: "30-45",
      gender: "unspecified",
      occupation: t.occupation ?? null,
      tech_comfort: t.tech_comfort ?? "medium",
      behavioral_traits: t.behavioral_traits ?? [],
      goals: t.goals ?? null,
      frustrations: t.frustrations ?? null,
      is_template: true,
      is_synthetic: true,
      generated_by_ai: false,
      created_at: now(),
    });
  }

  seedDemo(store);
  return store;
}

// A fully-populated demo project so the app matches the reference design on first load.
function seedDemo(store: Store): void {
  const project: Project = {
    id: uuid(),
    user_id: MOCK_USER_ID,
    name: "HMC Dashboard Revamp",
    description: "IBM Power HMC · React migration — consolidating action menus into a unified command bar",
    flow_type: "dashboard",
    status: "completed",
    created_at: now(),
    updated_at: now(),
  };
  store.projects.set(project.id, project);

  const shots: Array<[ScreenshotType, number, string]> = [
    ["before", 1, "01-login.png"],
    ["before", 2, "02-topology.png"],
    ["before", 3, "03-actions.png"],
    ["before", 4, "04-detail.png"],
    ["after", 1, "01-login.png"],
    ["after", 2, "02-dashboard.png"],
    ["after", 3, "03-command-bar.png"],
  ];
  for (const [type, seq, file] of shots) {
    const s: Screenshot = {
      id: uuid(),
      project_id: project.id,
      type,
      sequence_order: seq,
      file_name: file,
      file_path: `mock://project-screenshots/${project.id}/${file}`,
      screen_label: file.replace(/^\d+-/, "").replace(/\.\w+$/, "").replace(/-/g, " "),
      uploaded_at: now(),
    };
    store.screenshots.set(s.id, s);
  }

  const flow_diff: FlowDiff = {
    total_steps_before: 5,
    total_steps_after: 2,
    key_changes: [
      { screen_sequence: 1, change_type: "simplified", description: "Consolidated three action panels into one command bar.", ux_impact: "Reduces navigation steps from 4 to 1." },
      { screen_sequence: 2, change_type: "reorganized", description: "Topology view restructured with clearer hierarchy.", ux_impact: "Faster orientation for admins." },
      { screen_sequence: 3, change_type: "error_handling", description: "Added inline validation on key actions.", ux_impact: "Prevents errors before submission." },
    ],
    friction_points_removed: ["Three separate action menus", "Deferred validation", "Redundant confirmation step"],
    new_capabilities_added: ["Unified command bar", "Inline validation"],
  };
  const analysis: Analysis = {
    id: uuid(),
    project_id: project.id,
    status: "completed",
    before_summary: "The legacy WidEast panel framework spreads actions across three separate menus with a dense topology view.",
    after_summary: "The new React UI consolidates actions into a unified command bar with a clearer topology and inline validation.",
    flow_diff,
    raw_gemini_response: null,
    raw_claude_response: null,
    processing_time_ms: 1840,
    created_at: now(),
  };
  store.analyses.set(analysis.id, analysis);

  const personaSpecs: Array<{ name: string; occ: string; age: string; exp: number; device: string; tech: Persona["tech_comfort"]; traits: string[]; goal: string; before: number; after: number; score: number; fr: { sev: "low" | "medium" | "high"; n: number }[] }> = [
    { name: "Rajesh M.", occ: "Senior Sys Admin · IBM", age: "42", exp: 14, device: "Desktop", tech: "high", traits: ["Power user", "Keyboard-first", "Detail-oriented"], goal: "Process tasks with minimal clicks", before: 0.65, after: 0.92, score: 9.1, fr: [{ sev: "low", n: 2 }] },
    { name: "Sunita P.", occ: "IT Manager · Siemens", age: "38", exp: 8, device: "Laptop", tech: "medium", traits: ["Risk-averse", "Enterprise admin"], goal: "Avoid mistakes on critical actions", before: 0.48, after: 0.79, score: 7.4, fr: [{ sev: "medium", n: 1 }, { sev: "low", n: 1 }] },
    { name: "David K.", occ: "Infrastructure Lead · BT", age: "47", exp: 20, device: "Desktop", tech: "high", traits: ["Detail-oriented", "Risk-averse", "Slow adopter"], goal: "Keep every step auditable", before: 0.55, after: 0.76, score: 6.8, fr: [{ sev: "high", n: 1 }, { sev: "medium", n: 2 }] },
  ];
  for (const spec of personaSpecs) {
    const persona: Persona = {
      id: uuid(),
      user_id: MOCK_USER_ID,
      project_id: project.id,
      name: spec.name,
      age_range: spec.age,
      gender: "unspecified",
      occupation: spec.occ,
      tech_comfort: spec.tech,
      behavioral_traits: spec.traits,
      goals: spec.goal,
      frustrations: "Hidden actions and unclear errors",
      experience_years: spec.exp,
      device_preference: spec.device,
      is_template: false,
      is_synthetic: true,
      generated_by_ai: true,
      created_at: now(),
    };
    store.personas.set(persona.id, persona);

    for (const flow of ["before", "after"] as const) {
      const rate = flow === "before" ? spec.before : spec.after;
      const points = flow === "after"
        ? spec.fr.flatMap((f) => Array.from({ length: f.n }, (_, i) => ({ screen_sequence: i + 1, description: `${f.sev} severity issue in the redesigned flow`, severity: f.sev, reason: "Surfaced during synthetic testing" })))
        : [{ screen_sequence: 1, description: "Required fields unclear", severity: "high" as const, reason: "Validation only on submit" }];
      const r: SyntheticTestResult = {
        id: uuid(),
        project_id: project.id,
        persona_id: persona.id,
        flow_type: flow,
        task_success_rate: rate,
        friction_points: points,
        time_to_task_estimate: flow === "after" ? "1m 48s" : "4m 12s",
        error_likelihood: flow === "after" ? "low" : "high",
        overall_score: flow === "after" ? spec.score : spec.score - 2.5,
        raw_ai_response: null,
        tested_at: now(),
      };
      store.testResults.set(r.id, r);
    }
  }

  const kpiData: Array<Omit<KPI, "id">> = [
    { name: "Task completion rate", category: "efficiency", before_score: 58, after_score: 84, delta: 26, delta_direction: "improvement", confidence_level: "high", confidence_score: 0.87, reasoning: "Consolidated action menu reduces navigation steps from 4 to 1.", measurement_method: "Track form submit success events post-launch", ux_principle: "Reducing cognitive load improves completion", persona_impact: ["Rajesh M.", "Sunita P."] },
    { name: "Time on task", category: "efficiency", before_score: 42, after_score: 81, delta: 39, delta_direction: "improvement", confidence_level: "high", confidence_score: 0.83, reasoning: "Streamlined workflow removes 3 intermediate navigation steps.", measurement_method: "Median time from flow start to success event", ux_principle: "Fewer steps reduce time to value", persona_impact: ["Rajesh M.", "David K."] },
    { name: "User error rate", category: "error_reduction", before_score: 45, after_score: 78, delta: 33, delta_direction: "improvement", confidence_level: "medium", confidence_score: 0.76, reasoning: "Clearer affordances and inline validation reduce wrong inputs.", measurement_method: "Count validation errors per session", ux_principle: "Prevent errors before they happen", persona_impact: ["Sunita P."] },
    { name: "Learnability — new user", category: "learnability", before_score: 42, after_score: 71, delta: 29, delta_direction: "improvement", confidence_level: "medium", confidence_score: 0.72, reasoning: "Consistent React patterns lower the learning curve for new admins.", measurement_method: "First-time-user success vs returning users", ux_principle: "Recognition over recall", persona_impact: ["Sunita P.", "David K."] },
    { name: "Accessibility compliance", category: "accessibility", before_score: 51, after_score: 78, delta: 27, delta_direction: "improvement", confidence_level: "medium", confidence_score: 0.7, reasoning: "Semantic HTML and WCAG 2.1 AA contrast ratios in the new design.", measurement_method: "Automated axe-core audit + manual checks", ux_principle: "Inclusive design widens reach", persona_impact: ["David K."] },
  ];
  const matrix: KPIMatrix = {
    id: uuid(),
    analysis_id: analysis.id,
    project_id: project.id,
    kpis: kpiData.map((k) => ({ id: uuid(), ...k })),
    overall_confidence: 0.87,
    generated_at: now(),
  };
  store.kpiMatrices.set(matrix.id, matrix);

  const report: Report = {
    id: uuid(),
    project_id: project.id,
    kpi_matrix_id: matrix.id,
    annotations: {},
    pdf_path: null,
    share_token: shareToken(),
    created_at: now(),
  };
  store.reports.set(report.id, report);
}

const g = globalThis as unknown as { __uxkpiStore?: Store };
const db: Store = (g.__uxkpiStore ??= seed());

export const CURRENT_USER_ID = MOCK_USER_ID;

// ── users ────────────────────────────────────────────────────────────────────
export function getUser(id: string): User | undefined {
  return db.users.get(id);
}

export function listUsers(): User[] {
  return [...db.users.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Aggregate counts for the admin overview. */
export function adminStats() {
  return {
    users: db.users.size,
    projects: db.projects.size,
    analyses: db.analyses.size,
    reports: db.reports.size,
    apiCalls: db.apiUsage.length,
  };
}

/** Returns false if the user is out of quota. */
export function hasQuota(userId: string): boolean {
  const u = db.users.get(userId);
  return !!u && u.quota_used < u.quota_analyses;
}

export function incrementQuotaUsed(userId: string): void {
  const u = db.users.get(userId);
  if (u) {
    u.quota_used += 1;
    u.updated_at = now();
  }
}

/** Admin: set a user's total analysis quota. */
export function setQuota(userId: string, quotaAnalyses: number): User | undefined {
  const u = db.users.get(userId);
  if (u) {
    u.quota_analyses = Math.max(0, quotaAnalyses);
    u.updated_at = now();
  }
  return u;
}

// ── api usage log ────────────────────────────────────────────────────────────
export function logApiUsage(input: {
  user_id: string;
  service: ApiService;
  endpoint: string;
  status: ApiCallStatus;
  tokens_used?: number;
  cost_estimate?: number;
}): void {
  const row: ApiUsageLog = {
    id: uuid(),
    user_id: input.user_id,
    service: input.service,
    endpoint: input.endpoint,
    tokens_used: input.tokens_used ?? 0,
    cost_estimate: input.cost_estimate ?? 0,
    status: input.status,
    called_at: now(),
  };
  db.apiUsage.unshift(row);
  if (db.apiUsage.length > 200) db.apiUsage.length = 200;
}

export function listApiUsage(limit = 50): ApiUsageLog[] {
  return db.apiUsage.slice(0, limit);
}

// ── AI services (admin CRUD) ──────────────────────────────────────────────────
export function listAIServices(): AIService[] {
  return [...db.aiServices.values()].sort(
    (a, b) => Number(b.builtin) - Number(a.builtin) || a.created_at.localeCompare(b.created_at),
  );
}

export function getAIService(id: string): AIService | undefined {
  return db.aiServices.get(id);
}

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function createAIService(input: {
  name: string;
  slug?: string;
  role?: string;
  provider?: string;
  model?: string;
  env_var?: string;
  enabled?: boolean;
}): { service?: AIService; error?: string } {
  const name = input.name.trim();
  if (!name) return { error: "Name is required" };
  const slug = slugify(input.slug || input.name);
  if (!slug) return { error: "Could not derive a slug from the name" };
  if ([...db.aiServices.values()].some((s) => s.slug === slug)) {
    return { error: `A service with slug "${slug}" already exists` };
  }
  const service: AIService = {
    id: uuid(),
    name,
    slug,
    role: input.role?.trim() || "Custom AI service",
    provider: input.provider?.trim() || null,
    model: input.model?.trim() || null,
    env_var: input.env_var?.trim() || null,
    enabled: input.enabled ?? true,
    builtin: false,
    created_at: now(),
  };
  db.aiServices.set(service.id, service);
  return { service };
}

export function updateAIService(
  id: string,
  patch: Partial<Pick<AIService, "name" | "role" | "provider" | "model" | "env_var" | "enabled">>,
): { service?: AIService; error?: string } {
  const s = db.aiServices.get(id);
  if (!s) return { error: "Unknown service" };
  if (patch.name !== undefined) s.name = patch.name?.trim() || s.name;
  if (patch.role !== undefined) s.role = patch.role?.trim() || s.role;
  if (patch.provider !== undefined) s.provider = patch.provider?.trim() || null;
  if (patch.model !== undefined) s.model = patch.model?.trim() || null;
  if (patch.env_var !== undefined) s.env_var = patch.env_var?.trim() || null;
  if (patch.enabled !== undefined) s.enabled = patch.enabled;
  return { service: s };
}

export function deleteAIService(id: string): boolean {
  return db.aiServices.delete(id);
}

/** Gate used by AI wrappers: a service is usable unless an admin disabled it. */
export function isServiceEnabled(slug: ApiService | string): boolean {
  const s = [...db.aiServices.values()].find((x) => x.slug === slug);
  return s ? s.enabled : true;
}

// ── projects ──────────────────────────────────────────────────────────────────
export function createProject(input: {
  user_id: string;
  name: string;
  description?: string;
  flow_type?: string;
}): Project {
  const project: Project = {
    id: uuid(),
    user_id: input.user_id,
    name: input.name,
    description: input.description ?? null,
    flow_type: input.flow_type ?? "custom",
    status: "draft",
    created_at: now(),
    updated_at: now(),
  };
  db.projects.set(project.id, project);
  return project;
}

export function listProjects(userId: string): Project[] {
  return [...db.projects.values()]
    .filter((p) => p.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getProject(id: string): Project | undefined {
  return db.projects.get(id);
}

export function updateProjectStatus(id: string, status: ProjectStatus): void {
  const p = db.projects.get(id);
  if (p) {
    p.status = status;
    p.updated_at = now();
  }
}

export function updateProject(
  id: string,
  patch: Partial<Pick<Project, "name" | "description" | "flow_type">>,
): Project | undefined {
  const p = db.projects.get(id);
  if (!p) return undefined;
  if (patch.name !== undefined && patch.name.trim()) p.name = patch.name.trim();
  if (patch.description !== undefined) p.description = patch.description;
  if (patch.flow_type !== undefined) p.flow_type = patch.flow_type;
  p.updated_at = now();
  return p;
}

// ── screenshots ───────────────────────────────────────────────────────────────
export function addScreenshots(
  rows: Array<{
    project_id: string;
    type: ScreenshotType;
    sequence_order: number;
    file_name: string;
    file_path: string;
    screen_label: string | null;
  }>,
): Screenshot[] {
  return rows.map((r) => {
    const s: Screenshot = { id: uuid(), uploaded_at: now(), ...r };
    db.screenshots.set(s.id, s);
    return s;
  });
}

export function listScreenshots(projectId: string): Screenshot[] {
  return [...db.screenshots.values()]
    .filter((s) => s.project_id === projectId)
    .sort(
      (a, b) =>
        a.type.localeCompare(b.type) || a.sequence_order - b.sequence_order,
    );
}

// ── analyses + jobs ─────────────────────────────────────────────────────────────
export function createJob(projectId: string): AnalysisJob {
  const job: AnalysisJob = {
    id: uuid(),
    project_id: projectId,
    status: "queued",
    analysis_id: null,
    error: null,
    created_at: now(),
  };
  db.jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): AnalysisJob | undefined {
  return db.jobs.get(id);
}

export function updateJob(id: string, patch: Partial<AnalysisJob>): void {
  const j = db.jobs.get(id);
  if (j) Object.assign(j, patch);
}

export function createAnalysis(input: {
  project_id: string;
  status: AnalysisStatus;
  before_summary?: string | null;
  after_summary?: string | null;
  flow_diff?: FlowDiff | null;
  raw_gemini_response?: unknown;
  raw_claude_response?: unknown;
  processing_time_ms?: number | null;
}): Analysis {
  const a: Analysis = {
    id: uuid(),
    project_id: input.project_id,
    status: input.status,
    before_summary: input.before_summary ?? null,
    after_summary: input.after_summary ?? null,
    flow_diff: input.flow_diff ?? null,
    raw_gemini_response: input.raw_gemini_response ?? null,
    raw_claude_response: input.raw_claude_response ?? null,
    processing_time_ms: input.processing_time_ms ?? null,
    created_at: now(),
  };
  db.analyses.set(a.id, a);
  return a;
}

export function getAnalysis(id: string): Analysis | undefined {
  return db.analyses.get(id);
}

export function getLatestAnalysis(projectId: string): Analysis | undefined {
  return [...db.analyses.values()]
    .filter((a) => a.project_id === projectId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

// ── personas ──────────────────────────────────────────────────────────────────
export function addPersonas(rows: Array<Omit<Persona, "id" | "created_at">>): Persona[] {
  return rows.map((r) => {
    const p: Persona = { id: uuid(), created_at: now(), ...r };
    db.personas.set(p.id, p);
    return p;
  });
}

export function getPersona(id: string): Persona | undefined {
  return db.personas.get(id);
}

/** Personas for a project plus the user's library + global templates. */
export function listPersonas(
  userId: string,
  projectId?: string,
): Persona[] {
  return [...db.personas.values()]
    .filter(
      (p) =>
        p.is_template ||
        (p.user_id === userId &&
          (projectId ? p.project_id === projectId || p.project_id === null : true)),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Detach a persona from its project so it lives in the user's library. */
export function saveToLibrary(id: string): Persona | undefined {
  const p = db.personas.get(id);
  if (p) p.project_id = null;
  return p;
}

// ── synthetic test results ────────────────────────────────────────────────────────
export function addTestResult(
  input: Omit<SyntheticTestResult, "id" | "tested_at">,
): SyntheticTestResult {
  const r: SyntheticTestResult = { id: uuid(), tested_at: now(), ...input };
  db.testResults.set(r.id, r);
  return r;
}

export function listTestResults(projectId: string): SyntheticTestResult[] {
  return [...db.testResults.values()]
    .filter((r) => r.project_id === projectId)
    .sort((a, b) => a.tested_at.localeCompare(b.tested_at));
}

// ── kpi matrices ────────────────────────────────────────────────────────────────
export function createKpiMatrix(input: {
  analysis_id: string;
  project_id: string;
  kpis: KPI[];
  overall_confidence: number;
}): KPIMatrix {
  const m: KPIMatrix = {
    id: uuid(),
    analysis_id: input.analysis_id,
    project_id: input.project_id,
    kpis: input.kpis,
    overall_confidence: input.overall_confidence,
    generated_at: now(),
  };
  db.kpiMatrices.set(m.id, m);
  return m;
}

export function getKpiMatrixByProject(projectId: string): KPIMatrix | undefined {
  return [...db.kpiMatrices.values()]
    .filter((m) => m.project_id === projectId)
    .sort((a, b) => b.generated_at.localeCompare(a.generated_at))[0];
}

// ── reports ───────────────────────────────────────────────────────────────────
export function createReport(input: {
  project_id: string;
  kpi_matrix_id: string;
  annotations?: AnnotationMap;
}): Report {
  const r: Report = {
    id: uuid(),
    project_id: input.project_id,
    kpi_matrix_id: input.kpi_matrix_id,
    annotations: input.annotations ?? {},
    pdf_path: null,
    share_token: shareToken(),
    created_at: now(),
  };
  db.reports.set(r.id, r);
  return r;
}

export function getReportByProject(projectId: string): Report | undefined {
  return [...db.reports.values()]
    .filter((r) => r.project_id === projectId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

export function getReportByShareToken(token: string): Report | undefined {
  return [...db.reports.values()].find((r) => r.share_token === token);
}

export function getReport(id: string): Report | undefined {
  return db.reports.get(id);
}

export function updateReportAnnotations(id: string, annotations: AnnotationMap): Report | undefined {
  const r = db.reports.get(id);
  if (r) r.annotations = annotations;
  return r;
}
