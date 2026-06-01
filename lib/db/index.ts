// Data-access facade. Delegates to the Supabase implementation when configured, otherwise the
// in-memory store. The Supabase-backed (user-data) functions are async; ephemeral analysis jobs and
// admin-managed AI-service config have no DB tables, so they stay synchronous in-memory.
//
// NOTE: in mock mode the async wrappers just resolve the synchronous in-memory result, so call
// sites await uniformly regardless of backend.
import { hasSupabase } from "@/lib/config";
import * as mem from "@/lib/db/memory";
import * as sb from "@/lib/db/supabase";

// ── In-memory only (no Supabase tables) — re-exported synchronously ──────────────
export const CURRENT_USER_ID = mem.CURRENT_USER_ID;
export type { AnalysisJob } from "@/lib/db/memory";

export const createJob = mem.createJob;
export const getJob = mem.getJob;
export const updateJob = mem.updateJob;

export const listAIServices = mem.listAIServices;
export const getAIService = mem.getAIService;
export const getAIServiceBySlug = mem.getAIServiceBySlug;
export const createAIService = mem.createAIService;
export const updateAIService = mem.updateAIService;
export const deleteAIService = mem.deleteAIService;
export const isServiceEnabled = mem.isServiceEnabled;

// ── Supabase-or-memory (user data) — async ───────────────────────────────────────
const pick = <A extends unknown[], R>(
  s: (...a: A) => Promise<R>,
  m: (...a: A) => R,
) => (...a: A): Promise<R> => (hasSupabase ? s(...a) : Promise.resolve(m(...a)));

export const getUser = pick(sb.getUser, mem.getUser);
export const listUsers = pick(sb.listUsers, mem.listUsers);

export const getOrganisation = pick(sb.getOrganisation, mem.getOrganisation);
export const listOrganisations = pick(sb.listOrganisations, mem.listOrganisations);
export const listOrgMembers = pick(sb.listOrgMembers, mem.listOrgMembers);
export const ensureOrgForUser = pick(sb.ensureOrgForUser, mem.ensureOrgForUser);

export const createNotification = pick(sb.createNotification, mem.createNotification);
export const listNotifications = pick(sb.listNotifications, mem.listNotifications);
export const markNotificationRead = pick(sb.markNotificationRead, mem.markNotificationRead);
export const markAllNotificationsRead = pick(sb.markAllNotificationsRead, mem.markAllNotificationsRead);

export const recordAudit = pick(sb.recordAudit, mem.recordAudit);
export const listAuditLog = pick(sb.listAuditLog, mem.listAuditLog);
export const adminStats = pick(sb.adminStats, mem.adminStats);
export const hasQuota = pick(sb.hasQuota, mem.hasQuota);
export const incrementQuotaUsed = pick(sb.incrementQuotaUsed, mem.incrementQuotaUsed);
export const setQuota = pick(sb.setQuota, mem.setQuota);
export const logApiUsage = pick(sb.logApiUsage, mem.logApiUsage);
export const listApiUsage = pick(sb.listApiUsage, mem.listApiUsage);

export const createProject = pick(sb.createProject, mem.createProject);
export const listProjects = pick(sb.listProjects, mem.listProjects);
export const getProject = pick(sb.getProject, mem.getProject);
export const updateProjectStatus = pick(sb.updateProjectStatus, mem.updateProjectStatus);
export const updateProject = pick(sb.updateProject, mem.updateProject);

export const addScreenshots = pick(sb.addScreenshots, mem.addScreenshots);
export const listScreenshots = pick(sb.listScreenshots, mem.listScreenshots);

export const createAnalysis = pick(sb.createAnalysis, mem.createAnalysis);
export const getAnalysis = pick(sb.getAnalysis, mem.getAnalysis);
export const getLatestAnalysis = pick(sb.getLatestAnalysis, mem.getLatestAnalysis);

export const addPersonas = pick(sb.addPersonas, mem.addPersonas);
export const getPersona = pick(sb.getPersona, mem.getPersona);
export const listPersonas = pick(sb.listPersonas, mem.listPersonas);
export const saveToLibrary = pick(sb.saveToLibrary, mem.saveToLibrary);

export const addTestResult = pick(sb.addTestResult, mem.addTestResult);
export const listTestResults = pick(sb.listTestResults, mem.listTestResults);

export const createKpiMatrix = pick(sb.createKpiMatrix, mem.createKpiMatrix);
export const getKpiMatrixByProject = pick(sb.getKpiMatrixByProject, mem.getKpiMatrixByProject);

export const createReport = pick(sb.createReport, mem.createReport);
export const getReportByProject = pick(sb.getReportByProject, mem.getReportByProject);
export const getReportByShareToken = pick(sb.getReportByShareToken, mem.getReportByShareToken);
export const getReport = pick(sb.getReport, mem.getReport);
export const updateReportAnnotations = pick(sb.updateReportAnnotations, mem.updateReportAnnotations);
