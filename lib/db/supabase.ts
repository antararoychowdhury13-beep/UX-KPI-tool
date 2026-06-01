// Supabase-backed data layer (used when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set).
// Uses a service-role client for server-side data ops; user scoping is done in queries (RLS lands
// in Stage 2). AI-service config and ephemeral analysis jobs have no tables — those stay in-memory
// (delegated from the facade in index.ts).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
import type { Persona, SyntheticTestResult } from "@/types/persona";
import type { KPI, KPIMatrix } from "@/types/kpi";
import type { Organisation } from "@/types/organisation";
import type { AppNotification } from "@/types/notification";
import type { AuditEntry } from "@/types/audit";
import type { AnnotationMap, ApiCallStatus, ApiService, ApiUsageLog, Report } from "@/types/report";

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        // Next.js patches global fetch and caches GET responses — that would serve stale/empty
        // query results. Force no-store so every query hits the database.
        global: {
          fetch: (input: RequestInfo | URL, init?: RequestInit) =>
            fetch(input, { ...init, cache: "no-store" }),
        },
      },
    );
  }
  return client;
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data as T;
}

// ── users ────────────────────────────────────────────────────────────────────
export async function getUser(id: string): Promise<User | undefined> {
  const { data, error } = await sb().from("users").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getUser failed: ${error.message}`);
  return (data as User) ?? undefined;
}

/** Ensure a public.users row exists for an authenticated user; create it on first login. */
export async function ensureUser(input: {
  id: string;
  email: string;
  full_name: string;
}): Promise<User> {
  const existing = await getUser(input.id);
  if (existing) return existing;
  // New users default to 'user'. Admin is granted only to emails in the ADMIN_EMAILS allowlist
  // (comma-separated) — important now that the app is publicly deployed.
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const role = adminEmails.includes(input.email.toLowerCase()) ? "admin" : "user";
  const { data, error } = await sb()
    .from("users")
    .insert({ id: input.id, email: input.email, full_name: input.full_name, role, quota_analyses: 10, quota_used: 0 })
    .select("*")
    .single();
  if (error) throw new Error(`ensureUser failed: ${error.message}`);
  return data as User;
}

export async function listUsers(): Promise<User[]> {
  return must(await sb().from("users").select("*").order("created_at")) as User[];
}

// ── notifications (spec v2 §3) — all best-effort so a missing table never breaks a request ──
export async function createNotification(input: {
  user_id: string;
  type: string;
  project_id?: string | null;
  message: string;
}): Promise<void> {
  try {
    await sb().from("notifications").insert({
      user_id: input.user_id,
      type: input.type,
      project_id: input.project_id ?? null,
      message: input.message,
    });
  } catch {
    /* table may not exist pre-migration 0006 */
  }
}
export async function listNotifications(userId: string): Promise<AppNotification[]> {
  const { data } = await sb()
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as AppNotification[]) ?? [];
}
export async function markNotificationRead(id: string, userId: string): Promise<void> {
  try {
    await sb().from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", userId);
  } catch {
    /* noop */
  }
}
export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    await sb().from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  } catch {
    /* noop */
  }
}

// ── audit log (spec v2 §3) — best-effort write, never blocks the request ───────────
export async function recordAudit(input: {
  user_id?: string | null;
  org_id?: string | null;
  action: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await sb().from("audit_log").insert({
      user_id: input.user_id ?? null,
      org_id: input.org_id ?? null,
      action: input.action,
      entity_type: input.entity_type ?? null,
      entity_id: input.entity_id ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    /* table may not exist pre-migration 0006 */
  }
}
export async function listAuditLog(limit = 100): Promise<AuditEntry[]> {
  const { data } = await sb().from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data as AuditEntry[]) ?? [];
}

// ── organisations (spec v2 §3) ───────────────────────────────────────────────────
export async function getOrganisation(id: string): Promise<Organisation | undefined> {
  const { data } = await sb().from("organisations").select("*").eq("id", id).maybeSingle();
  return (data as Organisation) ?? undefined;
}
export async function listOrganisations(): Promise<Organisation[]> {
  const { data } = await sb().from("organisations").select("*").order("created_at");
  return (data as Organisation[]) ?? [];
}
export async function listOrgMembers(orgId: string): Promise<User[]> {
  const { data } = await sb().from("users").select("*").eq("org_id", orgId).order("created_at");
  return (data as User[]) ?? [];
}

/**
 * Best-effort: return the user's organisation, creating a personal one on first use. Returns null
 * (never throws) if the organisations table / users.org_id column isn't present yet — i.e. the app
 * keeps working exactly as before until migration 0005 is applied.
 */
export async function ensureOrgForUser(user: User): Promise<Organisation | null> {
  try {
    if (user.org_id) return (await getOrganisation(user.org_id)) ?? null;
    const name = `${user.full_name ?? user.email}'s workspace`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + user.id.slice(0, 6);
    const created = await sb().from("organisations").insert({ name, slug }).select("*").single();
    if (created.error) return null;
    const org = created.data as Organisation;
    await sb().from("users").update({ org_id: org.id }).eq("id", user.id);
    return org;
  } catch {
    return null;
  }
}

export async function adminStats() {
  const count = async (table: string) => {
    const { count } = await sb().from(table).select("*", { count: "exact", head: true });
    return count ?? 0;
  };
  const [users, projects, analyses, reports, apiCalls] = await Promise.all([
    count("users"), count("projects"), count("analyses"), count("reports"), count("api_usage_log"),
  ]);
  return { users, projects, analyses, reports, apiCalls };
}

export async function hasQuota(userId: string): Promise<boolean> {
  const u = await getUser(userId);
  return !!u && u.quota_used < u.quota_analyses;
}

export async function incrementQuotaUsed(userId: string): Promise<void> {
  const u = await getUser(userId);
  if (u) await sb().from("users").update({ quota_used: u.quota_used + 1 }).eq("id", userId);
}

export async function setQuota(userId: string, quotaAnalyses: number): Promise<User | undefined> {
  const { data } = await sb()
    .from("users")
    .update({ quota_analyses: Math.max(0, quotaAnalyses) })
    .eq("id", userId)
    .select("*")
    .maybeSingle();
  return (data as User) ?? undefined;
}

// ── api usage log ──────────────────────────────────────────────────────────────
export async function logApiUsage(input: {
  user_id: string;
  service: ApiService;
  endpoint: string;
  status: ApiCallStatus;
  tokens_used?: number;
  cost_estimate?: number;
}): Promise<void> {
  await sb().from("api_usage_log").insert({
    user_id: input.user_id,
    service: input.service,
    endpoint: input.endpoint,
    status: input.status,
    tokens_used: input.tokens_used ?? 0,
    cost_estimate: input.cost_estimate ?? 0,
  });
}

export async function listApiUsage(limit = 50): Promise<ApiUsageLog[]> {
  return must(
    await sb().from("api_usage_log").select("*").order("called_at", { ascending: false }).limit(limit),
  ) as ApiUsageLog[];
}

// ── projects ──────────────────────────────────────────────────────────────────
export async function createProject(input: {
  user_id: string;
  name: string;
  description?: string;
  flow_type?: string;
}): Promise<Project> {
  return must(
    await sb()
      .from("projects")
      .insert({
        user_id: input.user_id,
        name: input.name,
        description: input.description ?? null,
        flow_type: input.flow_type ?? "custom",
        status: "draft",
      })
      .select("*")
      .single(),
  ) as Project;
}

export async function listProjects(userId: string): Promise<Project[]> {
  return must(
    await sb().from("projects").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ) as Project[];
}

export async function getProject(id: string): Promise<Project | undefined> {
  const { data } = await sb().from("projects").select("*").eq("id", id).maybeSingle();
  return (data as Project) ?? undefined;
}

export async function updateProjectStatus(id: string, status: ProjectStatus): Promise<void> {
  await sb().from("projects").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, "name" | "description" | "flow_type">>,
): Promise<Project | undefined> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name) update.name = patch.name;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.flow_type !== undefined) update.flow_type = patch.flow_type;
  const { data } = await sb().from("projects").update(update).eq("id", id).select("*").maybeSingle();
  return (data as Project) ?? undefined;
}

// ── screenshots ───────────────────────────────────────────────────────────────
export async function addScreenshots(
  rows: Array<{
    project_id: string;
    type: ScreenshotType;
    sequence_order: number;
    file_name: string;
    file_path: string;
    screen_label: string | null;
  }>,
): Promise<Screenshot[]> {
  return must(await sb().from("screenshots").insert(rows).select("*")) as Screenshot[];
}

export async function listScreenshots(projectId: string): Promise<Screenshot[]> {
  return must(
    await sb().from("screenshots").select("*").eq("project_id", projectId).order("type").order("sequence_order"),
  ) as Screenshot[];
}

// ── analyses ──────────────────────────────────────────────────────────────────
export async function createAnalysis(input: {
  project_id: string;
  status: AnalysisStatus;
  before_summary?: string | null;
  after_summary?: string | null;
  flow_diff?: FlowDiff | null;
  raw_gemini_response?: unknown;
  raw_claude_response?: unknown;
  processing_time_ms?: number | null;
}): Promise<Analysis> {
  return must(
    await sb()
      .from("analyses")
      .insert({
        project_id: input.project_id,
        status: input.status,
        before_summary: input.before_summary ?? null,
        after_summary: input.after_summary ?? null,
        flow_diff: input.flow_diff ?? null,
        raw_gemini_response: input.raw_gemini_response ?? null,
        raw_claude_response: input.raw_claude_response ?? null,
        processing_time_ms: input.processing_time_ms ?? null,
      })
      .select("*")
      .single(),
  ) as Analysis;
}

export async function getAnalysis(id: string): Promise<Analysis | undefined> {
  const { data } = await sb().from("analyses").select("*").eq("id", id).maybeSingle();
  return (data as Analysis) ?? undefined;
}

export async function getLatestAnalysis(projectId: string): Promise<Analysis | undefined> {
  const { data } = await sb()
    .from("analyses")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Analysis) ?? undefined;
}

// ── personas ──────────────────────────────────────────────────────────────────
// Columns added by later migrations (0002 + 0004). Persist them when present; if the target DB
// hasn't run the migration, Postgres/PostgREST errors naming the missing column — we strip that
// column and retry, so persona generation works on any schema version (base → 0002 → 0004).
const OPTIONAL_PERSONA_COLUMNS = [
  "experience_years",
  "device_preference",
  "age",
  "tech_comfort_score",
  "location",
  "motivation_quote",
  "role_level",
  "occupation_detail",
  "accessibility_profile",
];

export async function addPersonas(rows: Array<Omit<Persona, "id" | "created_at">>): Promise<Persona[]> {
  let payload: Array<Record<string, unknown>> = rows.map((r) => ({ ...r }));
  for (let attempt = 0; attempt < OPTIONAL_PERSONA_COLUMNS.length + 1; attempt++) {
    const res = await sb().from("personas").insert(payload).select("*");
    if (!res.error) return res.data as Persona[];
    // Extract the offending column name from messages like:
    //  "Could not find the 'location' column of 'personas' in the schema cache"
    //  "column \"location\" of relation \"personas\" does not exist"
    const m = res.error.message.match(/'([a-z_]+)' column|column "([a-z_]+)"/);
    const col = m?.[1] ?? m?.[2];
    if (col && OPTIONAL_PERSONA_COLUMNS.includes(col)) {
      payload = payload.map(({ [col]: _omit, ...rest }) => rest);
      continue;
    }
    throw new Error(`Supabase: ${res.error.message}`);
  }
  throw new Error("Supabase: could not insert personas after stripping optional columns");
}

export async function getPersona(id: string): Promise<Persona | undefined> {
  const { data } = await sb().from("personas").select("*").eq("id", id).maybeSingle();
  return (data as Persona) ?? undefined;
}

export async function listPersonas(userId: string, projectId?: string): Promise<Persona[]> {
  // Templates (global) + the user's own personas; if a project is given, restrict the user's set
  // to that project or their library (null project_id).
  const { data } = await sb()
    .from("personas")
    .select("*")
    .or(`is_template.eq.true,user_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  let rows = (data as Persona[]) ?? [];
  if (projectId) {
    rows = rows.filter(
      (p) => p.is_template || p.user_id !== userId || p.project_id === projectId || p.project_id === null,
    );
  }
  return rows;
}

export async function saveToLibrary(id: string): Promise<Persona | undefined> {
  const { data } = await sb().from("personas").update({ project_id: null }).eq("id", id).select("*").maybeSingle();
  return (data as Persona) ?? undefined;
}

// ── synthetic test results ────────────────────────────────────────────────────
export async function addTestResult(
  input: Omit<SyntheticTestResult, "id" | "tested_at">,
): Promise<SyntheticTestResult> {
  return must(await sb().from("synthetic_test_results").insert(input).select("*").single()) as SyntheticTestResult;
}

export async function listTestResults(projectId: string): Promise<SyntheticTestResult[]> {
  // Newest first: re-running (e.g. with a different testing method) appends new rows, and the
  // testing page picks the first match per persona/flow — so it must reflect the latest run.
  return must(
    await sb().from("synthetic_test_results").select("*").eq("project_id", projectId).order("tested_at", { ascending: false }),
  ) as SyntheticTestResult[];
}

// ── kpi matrices ────────────────────────────────────────────────────────────────
export async function createKpiMatrix(input: {
  analysis_id: string;
  project_id: string;
  kpis: KPI[];
  overall_confidence: number;
  ux_score_before?: number | null;
  ux_score_after?: number | null;
  ux_score_delta?: number | null;
}): Promise<KPIMatrix> {
  const full = {
    analysis_id: input.analysis_id,
    project_id: input.project_id,
    kpis: input.kpis,
    overall_confidence: input.overall_confidence,
    ux_score_before: input.ux_score_before ?? null,
    ux_score_after: input.ux_score_after ?? null,
    ux_score_delta: input.ux_score_delta ?? null,
  };
  const res = await sb().from("kpi_matrices").insert(full).select("*").single();
  if (!res.error) return res.data as KPIMatrix;
  // ux_score_* columns arrive with migration 0004 — retry without them on the base schema.
  if (/ux_score_(before|after|delta)/.test(res.error.message)) {
    const { ux_score_before: _b, ux_score_after: _a, ux_score_delta: _d, ...base } = full;
    return must(await sb().from("kpi_matrices").insert(base).select("*").single()) as KPIMatrix;
  }
  throw new Error(`Supabase: ${res.error.message}`);
}

export async function getKpiMatrixByProject(projectId: string): Promise<KPIMatrix | undefined> {
  const { data } = await sb()
    .from("kpi_matrices")
    .select("*")
    .eq("project_id", projectId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as KPIMatrix) ?? undefined;
}

// ── reports ───────────────────────────────────────────────────────────────────
export async function createReport(input: {
  project_id: string;
  kpi_matrix_id: string;
  annotations?: AnnotationMap;
}): Promise<Report> {
  return must(
    await sb()
      .from("reports")
      .insert({
        project_id: input.project_id,
        kpi_matrix_id: input.kpi_matrix_id,
        annotations: input.annotations ?? {},
      })
      .select("*")
      .single(),
  ) as Report;
}

export async function getReportByProject(projectId: string): Promise<Report | undefined> {
  const { data } = await sb()
    .from("reports")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Report) ?? undefined;
}

export async function getReportByShareToken(token: string): Promise<Report | undefined> {
  const { data } = await sb().from("reports").select("*").eq("share_token", token).maybeSingle();
  return (data as Report) ?? undefined;
}

export async function getReport(id: string): Promise<Report | undefined> {
  const { data } = await sb().from("reports").select("*").eq("id", id).maybeSingle();
  return (data as Report) ?? undefined;
}

export async function updateReportAnnotations(
  id: string,
  annotations: AnnotationMap,
): Promise<Report | undefined> {
  const { data } = await sb().from("reports").update({ annotations }).eq("id", id).select("*").maybeSingle();
  return (data as Report) ?? undefined;
}
