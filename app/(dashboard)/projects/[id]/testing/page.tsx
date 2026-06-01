import Link from "next/link";
import { notFound } from "next/navigation";
import { getLatestAnalysis, listPersonas, listTestResults } from "@/lib/db";
import { getCurrentUserId, getOwnedProject } from "@/lib/auth";
import { initials, avatarTone } from "@/lib/utils/initials";
import { StepRow } from "@/components/layout/StepRow";
import { RunTestsButton } from "@/components/analysis/RunTestsButton";
import type { FrictionPoint } from "@/types/persona";

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

  const [analysis, allPersonas, results] = await Promise.all([
    getLatestAnalysis(project.id),
    listPersonas(userId, project.id),
    listTestResults(project.id),
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

  return (
    <>
      <StepRow current="testing" />

      <div className="section-head">
        <div>
          <div className="section-title">Synthetic usability testing</div>
          <div className="section-sub">
            AI-simulated testing across {personas.length} personas · {project.name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {personas.length > 0 && <RunTestsButton projectId={project.id} hasResults={results.length > 0} />}
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

          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10, fontWeight: 500 }}>
            Per-persona results
          </div>

          {rows.map(({ persona, index, before, after }) => {
            const fc = after ? frictionCounts(after.friction_points) : null;
            return (
              <div key={persona.id} className="test-row">
                <div className={`pa ${avatarTone(index)}`} style={{ width: 32, height: 32, fontSize: 11 }}>
                  {initials(persona.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 5 }}>
                    {persona.name} — {persona.occupation || "—"}
                  </div>
                  {before && after ? (
                    <div className="vs-bars">
                      <div className="vs-bar-row">
                        <div className="vs-bar-lbl">Before</div>
                        <div className="vs-bar-track">
                          <div className="vs-bar-fill vb-before" style={{ width: `${Math.round(before.task_success_rate * 100)}%` }} />
                        </div>
                        <span className="vs-bar-pct">{Math.round(before.task_success_rate * 100)}%</span>
                      </div>
                      <div className="vs-bar-row">
                        <div className="vs-bar-lbl">After</div>
                        <div className="vs-bar-track">
                          <div className="vs-bar-fill vb-after" style={{ width: `${Math.round(after.task_success_rate * 100)}%` }} />
                        </div>
                        <span className="vs-bar-pct" style={{ color: "var(--text)" }}>
                          {Math.round(after.task_success_rate * 100)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>Not tested yet.</div>
                  )}
                </div>

                {fc && (
                  <div className="friction-info">
                    {fc.high > 0 && (
                      <div className="fi-row"><div className="fdot fd-h" />{fc.high} high friction{fc.high > 1 ? "s" : ""}</div>
                    )}
                    {fc.medium > 0 && (
                      <div className="fi-row"><div className="fdot fd-m" />{fc.medium} medium</div>
                    )}
                    {fc.low > 0 && (
                      <div className="fi-row"><div className="fdot fd-l" />{fc.low} low</div>
                    )}
                    {fc.high + fc.medium + fc.low === 0 && (
                      <div className="fi-row"><div className="fdot fd-l" />no frictions</div>
                    )}
                  </div>
                )}

                {after && (
                  <div className="score-col">
                    <div className="score-num">{after.overall_score.toFixed(1)}</div>
                    <div className="score-lbl">score</div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
