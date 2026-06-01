// POST /api/test — run synthetic usability testing for a project's personas (before + after).
// Stores one synthetic_test_results row per persona per flow variant.
import { NextResponse } from "next/server";
import {
  getLatestAnalysis,
  listPersonas,
  addTestResult,
  logApiUsage,
} from "@/lib/db";
import { runSyntheticTest } from "@/lib/ai/claude";
import { resolveTextProvider } from "@/lib/ai/providers";
import { getCurrentUserIdOrNull, getOwnedProject } from "@/lib/auth";
import { checkRateLimit } from "@/lib/utils/rateLimiter";
import { readJson, badRequest, unauthorized } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();

  const body = await readJson<{ projectId?: string }>(req);
  if (!body) return badRequest("Invalid JSON body");
  const { projectId } = body;
  const project = projectId ? await getOwnedProject(projectId, userId) : null;
  if (!project) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  if (!(await checkRateLimit(userId))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const analysis = await getLatestAnalysis(project.id);
  const keyChanges = JSON.stringify(analysis?.flow_diff?.key_changes ?? []);
  const personas = (await listPersonas(userId, project.id)).filter(
    (p) => p.project_id === project.id,
  );

  if (personas.length === 0) {
    return NextResponse.json(
      { error: "Generate personas before running tests" },
      { status: 400 },
    );
  }

  const results = [];
  for (const persona of personas) {
    for (const flowType of ["before", "after"] as const) {
      const raw = await runSyntheticTest({
        personaJson: JSON.stringify(persona),
        personaName: persona.name,
        flowType,
        flowDescription: project.description ?? "",
        keyChanges,
      });
      results.push(
        await addTestResult({
          project_id: project.id,
          persona_id: persona.id,
          flow_type: flowType,
          task_success_rate: raw.task_success_rate,
          friction_points: raw.friction_points,
          time_to_task_estimate: raw.estimated_time_to_task,
          error_likelihood: raw.error_likelihood,
          overall_score: raw.overall_score,
          raw_ai_response: raw,
        }),
      );
    }
  }

  await logApiUsage({ user_id: userId, service: resolveTextProvider()?.slug ?? "claude", endpoint: "/api/test", status: "success" });
  return NextResponse.json({ results }, { status: 201 });
}
