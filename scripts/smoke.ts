// End-to-end pipeline smoke test (mock mode). Run: npx tsx scripts/smoke.ts
import {
  createProject,
  addScreenshots,
  createJob,
  getJob,
  getLatestAnalysis,
  addPersonas,
  listPersonas,
  addTestResult,
  listTestResults,
  createKpiMatrix,
  getKpiMatrixByProject,
  createReport,
  getReportByShareToken,
  CURRENT_USER_ID,
} from "@/lib/db";
import { processAnalysis } from "@/lib/queue/workers/analyzeScreenshots";
import { generatePersonas, runSyntheticTest, generateKpiMatrix } from "@/lib/ai/claude";
import { uuid } from "@/lib/utils/ids";
import type { KPI } from "@/types/kpi";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`❌ ${msg}`);
  console.log(`✓ ${msg}`);
}

async function main() {
  // 1. Project + screenshots
  const project = createProject({
    user_id: CURRENT_USER_ID,
    name: "Checkout redesign",
    description: "Simplify the multi-step checkout flow",
    flow_type: "form",
  });
  addScreenshots([
    { project_id: project.id, type: "before", sequence_order: 1, file_name: "01-cart.png", file_path: "mock", screen_label: "Cart" },
    { project_id: project.id, type: "after", sequence_order: 1, file_name: "01-cart.png", file_path: "mock", screen_label: "Cart" },
  ]);

  // 2. Analysis (inline)
  const job = createJob(project.id);
  await processAnalysis(project.id, job.id);
  assert(getJob(job.id)?.status === "completed", "analysis job completed");
  const analysis = getLatestAnalysis(project.id);
  assert(analysis?.flow_diff?.key_changes.length, "analysis produced flow diff");

  // 3. Personas
  const generated = await generatePersonas({
    count: 3,
    flowDescription: project.description ?? "",
    productType: "E-commerce",
    demographics: "",
    traits: "Impatient",
    techComfort: "low to high",
  });
  addPersonas(
    generated.map((g) => ({
      user_id: CURRENT_USER_ID,
      project_id: project.id,
      name: g.name,
      age_range: String(g.age),
      gender: g.gender,
      occupation: g.occupation,
      tech_comfort: g.tech_comfort,
      behavioral_traits: g.behavioral_traits,
      goals: g.primary_goal,
      frustrations: g.key_frustration,
      is_template: false,
      is_synthetic: true,
      generated_by_ai: true,
    })),
  );
  const personas = listPersonas(CURRENT_USER_ID, project.id).filter((p) => p.project_id === project.id);
  assert(personas.length === 3, "3 personas generated and stored");

  // 4. Synthetic testing
  for (const persona of personas) {
    for (const flowType of ["before", "after"] as const) {
      const raw = await runSyntheticTest({
        personaJson: JSON.stringify(persona),
        personaName: persona.name,
        flowType,
        flowDescription: project.description ?? "",
        keyChanges: JSON.stringify(analysis?.flow_diff?.key_changes ?? []),
      });
      addTestResult({
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
    }
  }
  assert(listTestResults(project.id).length === 6, "6 synthetic test results (3 personas × before/after)");

  // 5. KPI matrix
  const result = await generateKpiMatrix({
    analysisJson: JSON.stringify(analysis?.flow_diff ?? {}),
    testResultsJson: JSON.stringify(listTestResults(project.id)),
    personasJson: JSON.stringify(personas),
    industryContext: "E-commerce",
    personaNames: personas.map((p) => p.name),
  });
  const kpis: KPI[] = result.kpis.map((k) => ({ id: uuid(), ...k }));
  createKpiMatrix({ analysis_id: analysis!.id, project_id: project.id, kpis, overall_confidence: result.overall_confidence });
  const matrix = getKpiMatrixByProject(project.id);
  assert((matrix?.kpis.length ?? 0) >= 5, `KPI matrix has >=5 KPIs (got ${matrix?.kpis.length})`);
  assert(matrix!.kpis.every((k) => typeof k.before_score === "number" && typeof k.after_score === "number" && "delta" in k), "every KPI has before/after/delta");

  // 6. Report + share link
  const report = createReport({ project_id: project.id, kpi_matrix_id: matrix!.id });
  assert(!!report.share_token, "report created with share token");
  assert(getReportByShareToken(report.share_token)?.id === report.id, "report retrievable by share token (public link)");

  console.log("\n🎉 Full pipeline OK in mock mode.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
