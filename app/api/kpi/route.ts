// POST /api/kpi — generate the KPI matrix from the latest analysis, personas, and test results.
import { NextResponse } from "next/server";
import {
  getProject,
  getLatestAnalysis,
  listPersonas,
  listTestResults,
  createKpiMatrix,
  logApiUsage,
} from "@/lib/db";
import { generateKpiMatrix } from "@/lib/ai/claude";
import { resolveTextProvider } from "@/lib/ai/providers";
import { getCurrentUserIdOrNull } from "@/lib/auth";
import { checkRateLimit } from "@/lib/utils/rateLimiter";
import { uuid } from "@/lib/utils/ids";
import { readJson, badRequest, unauthorized } from "@/lib/http";
import type { KPI } from "@/types/kpi";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await readJson<{ projectId?: string; industryContext?: string }>(req);
  if (!body) return badRequest("Invalid JSON body");
  const { projectId, industryContext } = body;
  if (!projectId || !(await getProject(projectId))) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  if (!(await checkRateLimit(userId))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const analysis = await getLatestAnalysis(projectId);
  if (!analysis) {
    return NextResponse.json(
      { error: "Run analysis before generating KPIs" },
      { status: 400 },
    );
  }

  const personas = (await listPersonas(userId, projectId)).filter(
    (p) => p.project_id === projectId,
  );
  const testResults = await listTestResults(projectId);

  const result = await generateKpiMatrix({
    analysisJson: JSON.stringify(analysis.flow_diff ?? {}),
    testResultsJson: JSON.stringify(testResults),
    personasJson: JSON.stringify(personas),
    industryContext: industryContext ?? "Enterprise Software",
    personaNames: personas.map((p) => p.name),
  });

  const kpis: KPI[] = result.kpis.map((k) => ({ id: uuid(), ...k }));

  const matrix = await createKpiMatrix({
    analysis_id: analysis.id,
    project_id: projectId,
    kpis,
    overall_confidence: result.overall_confidence,
  });
  await logApiUsage({ user_id: userId, service: resolveTextProvider()?.slug ?? "claude", endpoint: "/api/kpi", status: "success" });

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
