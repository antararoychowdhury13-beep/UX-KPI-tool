import Link from "next/link";
import { notFound } from "next/navigation";
import { getLatestAnalysis, listPersonas, listTestResults, listScreenshots } from "@/lib/db";
import { getCurrentUserId, getOwnedProject } from "@/lib/auth";
import { StepRow } from "@/components/layout/StepRow";
import { TestingControls } from "@/components/testing/TestingControls";
import { TestResultRow } from "@/components/testing/TestResultRow";
import { activeModelInfo } from "@/lib/ai/providers";
import {
  TESTING_METHODS,
  type FrictionPoint,
  type SyntheticTestRaw,
  type TestingMethod,
} from "@/types/persona";

function frictionCounts(points: FrictionPoint[]) {
  return {
    high: points.filter((p) => p.severity === "high").length,
    medium: points.filter((p) => p.severity === "medium").length,
    low: points.filter((p) => p.severity === "low").length,
  };
}

export default async function TestingPage({ params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  const project = await getOwnedProject(params.id, userId);
  if (!project) notFound();

  const [analysis, allPersonas, results, screenshots] = await Promise.all([
    getLatestAnalysis(project.id),
    listPersonas(userId, project.id),
    listTestResults(project.id),
    listScreenshots(project.id),
  ]);
  const personas = allPersonas.filter((p) => p.project_id === project.id);

  const rows = personas.map((p, i) => ({
    persona: p,
    index: i,
    before: results.find((r) => r.persona_id === p.id && r.flow_type === "before"),
    after: results.find((r) => r.persona_id === p.id && r.flow_type === "after"),
  }));

  const tested = rows.filter((r) => r.before && r.after);
  const avgBefore = tested.length
    ? Math.round((tested.reduce((s, r) => s + (r.before!.task_success_rate || 0), 0) / tested.length) * 100)
    : 0;
  const avgAfter = tested.length
    ? Math.round((tested.reduce((s, r) => s + (r.after!.task_success_rate || 0), 0) / tested.length) * 100)
    : 0;
  const highRemoved = tested.reduce(
    (s, r) => s + frictionCounts(r.before!.friction_points).high,
    0,
  );

  // Which method produced the existing results (drives the selector default + header label).
  const currentMethod: TestingMethod =
    (results[0]?.raw_ai_response as SyntheticTestRaw | undefined)?.testing_method ?? "heuristic";
  const methodMeta = TESTING_METHODS.find((m) => m.value === currentMethod);
  const methodLabel = methodMeta?.title ?? "Heuristic Walkthrough";

  return (
    <>
      <StepRow current="testing" />

      <div className="section-head">
        <div>
          <div className="section-title">Synthetic usability testing</div>
          <div className="section-sub">
            {results.length > 0 ? `${methodLabel} · ` : ""}
            AI-simulated testing across {personas.length} personas · {project.name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {results.length > 0 && (
            <Link href={`/projects/${project.id}/kpi`} className="tb-btn">
              <i className="ti ti-chart-bar" /> KPI matrix
            </Link>
          )}
        </div>
      </div>

      {!analysis && (
        <div className="hint">
          <i className="ti ti-alert-triangle" />
          <div>Run the screenshot analysis (Upload step) first for richer test results.</div>
        </div>
      )}

      {personas.length === 0 ? (
        <div className="card">Generate personas before running tests.</div>
      ) : (
        <>
          {results.length > 0 && (
            <div className="test-method-bar">
              <div className="tmb-left">
                <i className={`ti ${methodMeta?.icon ?? "ti-checklist"}`} />
                <div>
                  <div className="tmb-method">{methodLabel}</div>
                  <div className="tmb-sub">{methodMeta?.desc ?? "before vs after, per persona"}</div>
                </div>
              </div>
              <div className="tmb-right">
                <span className="tmb-badge">{personas.length} personas</span>
                <span className="tmb-badge">{screenshots.length} screens</span>
              </div>
            </div>
          )}

          <TestingControls
            projectId={project.id}
            hasResults={results.length > 0}
            currentMethod={currentMethod}
            model={activeModelInfo()}
          />

          {tested.length > 0 && (
            <div className="test-stat-grid">
              <div className="stat-card">
                <div className="stat-label">Avg task success — before</div>
                <div className="stat-value" style={{ color: "var(--text3)" }}>{avgBefore}%</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg task success — after</div>
                <div className="stat-value">{avgAfter}%</div>
                <div className="stat-delta">↑ +{avgAfter - avgBefore} pts improvement</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">High-severity frictions (before)</div>
                <div className="stat-value">{highRemoved}</div>
                <div className="stat-delta">across all personas</div>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text3)", margin: "10px 0", fontWeight: 500 }}>
              Per-persona results <span style={{ color: "var(--text3)", fontWeight: 400 }}>· expand a row for the {methodLabel.toLowerCase()} detail</span>
            </div>
          )}

          {rows.map(({ persona, index, before, after }) => (
            <TestResultRow key={persona.id} persona={persona} index={index} before={before} after={after} />
          ))}
        </>
      )}
    </>
  );
}
