// POST /api/kpi — generate the KPI matrix from the latest analysis, personas, and test results.
import { NextResponse } from "next/server";
import {
  getLatestAnalysis,
  createAnalysis,
  listPersonas,
  listTestResults,
  createKpiMatrix,
  logApiUsage,
  createNotification,
  recordAudit,
} from "@/lib/db";
import { generateKpiMatrix } from "@/lib/ai/claude";
import { resolveTextProvider } from "@/lib/ai/providers";
import { getCurrentUserIdOrNull, getOwnedProject } from "@/lib/auth";
import { checkRateLimit } from "@/lib/utils/rateLimiter";
import { uuid } from "@/lib/utils/ids";
import { readJson, badRequest, unauthorized } from "@/lib/http";
import { deliverWebhooks } from "@/lib/webhooks/deliver";
import type { KPI } from "@/types/kpi";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();

  const body = await readJson<{ projectId?: string; industryContext?: string }>(req);
  if (!body) return badRequest("Invalid JSON body");
  const { projectId, industryContext } = body;
  const project = projectId ? await getOwnedProject(projectId, userId) : null;
  if (!project) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  if (!(await checkRateLimit(userId))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let analysis = await getLatestAnalysis(project.id);
  const personas = (await listPersonas(userId, project.id)).filter(
    (p) => p.project_id === project.id,
  );
  const testResults = await listTestResults(project.id);

  // The screenshot analysis is optional — KPIs can be synthesised from personas + synthetic test
  // results alone (a v3 run may have no uploaded screenshots). Require at least one signal.
  if (!analysis && testResults.length === 0 && personas.length === 0) {
    return NextResponse.json(
      { error: "Generate personas (and ideally run synthetic tests) before generating KPIs." },
      { status: 400 },
    );
  }

  // kpi_matrices.analysis_id is NOT NULL, so synthesise a minimal analysis row when none exists
  // (e.g. tests run without uploaded screenshots) to anchor the matrix.
  if (!analysis) {
    analysis = await createAnalysis({ project_id: project.id, status: "completed" });
  }

  const result = await generateKpiMatrix({
    analysisJson: JSON.stringify(analysis?.flow_diff ?? {}),
    testResultsJson: JSON.stringify(testResults),
    personasJson: JSON.stringify(personas),
    industryContext: industryContext ?? "Enterprise Software",
    personaNames: personas.map((p) => p.name),
  });

  const kpis: KPI[] = result.kpis.map((k) => ({ id: uuid(), ...k }));

  // Composite UX score (0-100): use the model's scores when present, else average the KPI scores.
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const uxBefore = Math.round(result.ux_score_before ?? avg(kpis.map((k) => k.before_score)));
  const uxAfter = Math.round(result.ux_score_after ?? avg(kpis.map((k) => k.after_score)));

  const matrix = await createKpiMatrix({
    analysis_id: analysis.id,
    project_id: project.id,
    kpis,
    overall_confidence: result.overall_confidence,
    ux_score_before: uxBefore,
    ux_score_after: uxAfter,
    ux_score_delta: uxAfter - uxBefore,
  });
  await logApiUsage({ user_id: userId, service: resolveTextProvider()?.slug ?? "claude", endpoint: "/api/kpi", status: "success" });
  await createNotification({ user_id: userId, type: "kpi_ready", project_id: project.id, message: `KPI matrix ready for "${project.name}" — UX score ${uxAfter} (↑${uxAfter - uxBefore}).` });
  await recordAudit({ user_id: userId, action: "kpi.generated", entity_type: "kpi_matrix", entity_id: matrix.id, metadata: { ux_score_after: uxAfter } });
  await deliverWebhooks(userId, "kpi.ready", { project_id: project.id, kpi_matrix_id: matrix.id, ux_score_after: uxAfter });

  return NextResponse.json(
    {
      matrix,
      top_3_improvements: result.top_3_improvements,
      risks_and_regressions: result.risks_and_regressions,
      post_launch_tracking_plan: result.post_launch_tracking_plan,
    },
    { status: 201 },
  );
}
