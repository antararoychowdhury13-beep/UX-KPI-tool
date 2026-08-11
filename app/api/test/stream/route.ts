// POST /api/test/stream — run synthetic testing and stream per-persona progress over SSE
// (spec v2 §5). Same work as /api/test, but emits a step event as each persona/flow completes.
//
// v4: results come from the SynthUX measured engine (lib/synthux) — each persona is
// expanded into a simulated participant panel and every number is measured from those
// sessions, replacing the earlier single-prompt model estimate.
import { NextResponse } from "next/server";
import { getLatestAnalysis, listPersonas, listScreenshots, addTestResult, logApiUsage, createNotification } from "@/lib/db";
import { runMeasuredTest } from "@/lib/synthux";
import { resolveTextProvider } from "@/lib/ai/providers";
import { getCurrentUserIdOrNull, getOwnedProject } from "@/lib/auth";
import { checkRateLimit } from "@/lib/utils/rateLimiter";
import { readJson, badRequest, unauthorized } from "@/lib/http";
import { sseResponse } from "@/lib/sse";
import { deliverWebhooks } from "@/lib/webhooks/deliver";
import { TESTING_METHODS, type TestingMethod } from "@/types/persona";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED: string[] = TESTING_METHODS.map((m) => m.value);

export async function POST(req: Request) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();

  const body = await readJson<{ projectId?: string; method?: string; model?: string }>(req);
  if (!body) return badRequest("Invalid JSON body");
  const method: TestingMethod = body.method && ALLOWED.includes(body.method) ? body.method : "heuristic";
  const model = typeof body.model === "string" ? body.model : undefined;
  const project = body.projectId ? await getOwnedProject(body.projectId, userId) : null;
  if (!project) return NextResponse.json({ error: "Unknown project" }, { status: 404 });

  if (!(await checkRateLimit(userId))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const analysis = await getLatestAnalysis(project.id);
  const keyChanges: string[] = (analysis?.flow_diff?.key_changes ?? []).map((c: unknown) =>
    typeof c === "string" ? c : JSON.stringify(c),
  );
  const screenshots = await listScreenshots(project.id);
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
          label: `Simulating panel for ${persona.name} — ${flowType} flow`,
          progress: Math.round((done / total) * 100),
          detail: persona.name,
        });
        // `model` is kept for the future live-perception path; the measured
        // engine itself is deterministic and model-free.
        void model;
        const raw = runMeasuredTest({
          persona,
          flowType,
          keyChanges,
          method,
          screenCount: screenshots.filter((s) => s.type === flowType).length,
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
    await deliverWebhooks(userId, "testing.completed", { project_id: project.id, method, personas: personas.length });
    emit({ type: "step", label: "Finalising results", progress: 100 });
    emit({ type: "done" });
  });
}
