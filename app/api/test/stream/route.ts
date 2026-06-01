// POST /api/test/stream — run synthetic testing and stream per-persona progress over SSE
// (spec v2 §5). Same work as /api/test, but emits a step event as each persona/flow completes.
import { NextResponse } from "next/server";
import { getLatestAnalysis, listPersonas, addTestResult, logApiUsage, createNotification } from "@/lib/db";
import { runSyntheticTest } from "@/lib/ai/claude";
import { resolveTextProvider } from "@/lib/ai/providers";
import { getCurrentUserIdOrNull, getOwnedProject } from "@/lib/auth";
import { checkRateLimit } from "@/lib/utils/rateLimiter";
import { readJson, badRequest, unauthorized } from "@/lib/http";
import { sseResponse } from "@/lib/sse";
import type { TestingMethod } from "@/types/persona";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED: TestingMethod[] = ["heuristic", "task_scenario", "think_aloud", "cognitive_load"];

export async function POST(req: Request) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();

  const body = await readJson<{ projectId?: string; method?: string }>(req);
  if (!body) return badRequest("Invalid JSON body");
  const method: TestingMethod = ALLOWED.includes(body.method as TestingMethod)
    ? (body.method as TestingMethod)
    : "heuristic";
  const project = body.projectId ? await getOwnedProject(body.projectId, userId) : null;
  if (!project) return NextResponse.json({ error: "Unknown project" }, { status: 404 });

  if (!(await checkRateLimit(userId))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const analysis = await getLatestAnalysis(project.id);
  const keyChanges = JSON.stringify(analysis?.flow_diff?.key_changes ?? []);
  const personas = (await listPersonas(userId, project.id)).filter((p) => p.project_id === project.id);
  if (personas.length === 0) {
    return NextResponse.json({ error: "Generate personas before running tests" }, { status: 400 });
  }

  const flows = ["before", "after"] as const;
  const total = personas.length * flows.length;

  return sseResponse(async (emit) => {
    let done = 0;
    for (const persona of personas) {
      for (const flowType of flows) {
        emit({
          type: "step",
          label: `Evaluating ${persona.name} — ${flowType} flow`,
          progress: Math.round((done / total) * 100),
          detail: persona.name,
        });
        const raw = await runSyntheticTest({
          personaJson: JSON.stringify(persona),
          personaName: persona.name,
          flowType,
          flowDescription: project.description ?? "",
          keyChanges,
          method,
        });
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
        });
        done++;
      }
    }
    await logApiUsage({
      user_id: userId,
      service: resolveTextProvider()?.slug ?? "claude",
      endpoint: "/api/test/stream",
      status: "success",
    });
    await createNotification({
      user_id: userId,
      type: "testing_complete",
      project_id: project.id,
      message: `Synthetic testing finished for "${project.name}" across ${personas.length} personas.`,
    });
    emit({ type: "step", label: "Finalising results", progress: 100 });
    emit({ type: "done" });
  });
}
