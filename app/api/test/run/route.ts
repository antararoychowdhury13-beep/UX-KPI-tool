// POST /api/test/run — persist a summary of a completed synthetic test run (spec v3 §6).
// The per-persona/per-flow results are already saved by /api/test/stream; this records the
// run-level provenance (methods, flow mode, model assignments) and aggregate UX scores so the
// KPI matrix and report can be generated from a durable run record.
import { NextResponse } from "next/server";
import { listTestResults, listPersonas, createTestRun, recordAudit } from "@/lib/db";
import { getCurrentUserIdOrNull, getOwnedProject } from "@/lib/auth";
import { readJson, badRequest, unauthorized } from "@/lib/http";
import type { FlowMode } from "@/types/testing";

export const runtime = "nodejs";

const FLOW_MODES: FlowMode[] = ["single", "before_after", "multi_variant"];

export async function POST(req: Request) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();

  const body = await readJson<{
    projectId?: string;
    methods?: string[];
    flowMode?: string;
    modelAssignments?: unknown;
    totalAiCalls?: number;
  }>(req);
  if (!body) return badRequest("Invalid JSON body");

  const project = body.projectId ? await getOwnedProject(body.projectId, userId) : null;
  if (!project) return NextResponse.json({ error: "Unknown project" }, { status: 404 });

  const flowMode: FlowMode = FLOW_MODES.includes(body.flowMode as FlowMode)
    ? (body.flowMode as FlowMode)
    : "before_after";
  const methods = Array.isArray(body.methods) && body.methods.length ? body.methods : ["heuristic"];

  // Aggregate the saved per-persona results into run-level UX scores (overall_score is 0-10 → ×10).
  const results = await listTestResults(project.id);
  const personas = (await listPersonas(userId, project.id)).filter((p) => p.project_id === project.id);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const beforeScores = results.filter((r) => r.flow_type === "before").map((r) => r.overall_score);
  const afterScores = results.filter((r) => r.flow_type === "after").map((r) => r.overall_score);
  const uxBefore = beforeScores.length ? Math.round(avg(beforeScores) * 10) : null;
  const uxAfter = afterScores.length ? Math.round(avg(afterScores) * 10) : null;
  const uxDelta = uxBefore !== null && uxAfter !== null ? uxAfter - uxBefore : null;

  try {
    const run = await createTestRun({
      project_id: project.id,
      flow_mode: flowMode,
      methods_selected: methods,
      persona_ids: personas.map((p) => p.id),
      model_assignments: body.modelAssignments ?? null,
      status: "completed",
      ux_score_before: uxBefore,
      ux_score_after: uxAfter,
      ux_delta: uxDelta,
      total_ai_calls: typeof body.totalAiCalls === "number" ? body.totalAiCalls : results.length,
    });
    try {
      await recordAudit({ user_id: userId, action: "test_run.completed", entity_type: "test_run", entity_id: run.id, metadata: { methods, flowMode, uxAfter } });
    } catch {}
    return NextResponse.json({ run }, { status: 201 });
  } catch (e) {
    // test_runs table arrives with migration 0007; if it isn't applied the per-persona results are
    // still saved, so the KPI/report path keeps working — report the soft failure without 500-ing.
    return NextResponse.json(
      { run: null, warning: e instanceof Error ? e.message : "Could not persist test run summary" },
      { status: 200 },
    );
  }
}
