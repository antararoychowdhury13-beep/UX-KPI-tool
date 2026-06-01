import { ExportPdfButton } from "@/components/report/ExportPdfButton";
import { ShareButton } from "@/components/report/ShareButton";
import { KPIBarChart } from "@/components/report/KPIBarChart";
import { AnnotatedComparison } from "@/components/report/AnnotatedComparison";
import { IntegrationButton } from "@/components/integrations/IntegrationButton";
import type { Project, Analysis } from "@/types/project";
import type { KPIMatrix } from "@/types/kpi";
import type { Persona, SyntheticTestResult } from "@/types/persona";
import type { AnnotationMap } from "@/types/report";

export function ReportDashboard({
  project,
  analysis,
  matrix,
  personas,
  testResults,
  generatedAt,
  shareToken,
  reportId,
  annotations,
  editable = false,
}: {
  project: Project;
  analysis: Analysis | null;
  matrix: KPIMatrix;
  personas: Persona[];
  testResults: SyntheticTestResult[];
  generatedAt: string;
  shareToken?: string;
  reportId?: string;
  annotations?: AnnotationMap;
  editable?: boolean;
}) {
  const avgBefore = Math.round(avg(matrix.kpis.map((k) => k.before_score)));
  const avgAfter = Math.round(avg(matrix.kpis.map((k) => k.after_score)));

  const top3 = [...matrix.kpis]
    .filter((k) => k.delta_direction === "improvement")
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);
  const chartKpis = matrix.kpis.slice(0, 5);

  // Per-persona after-flow score for the heatmap.
  const heat = personas
    .map((p) => {
      const after = testResults.find((r) => r.persona_id === p.id && r.flow_type === "after");
      return after ? { name: p.name, score: after.overall_score } : null;
    })
    .filter((x): x is { name: string; score: number } => !!x);

  const highFriction = testResults
    .filter((r) => r.flow_type === "after")
    .flatMap((r) => r.friction_points.filter((f) => f.severity === "high").map((f) => ({ r, f })))[0];

  return (
    <>
      <div className="report-hero">
        <div>
          <div className="rh-tag">UX Impact Report</div>
          <div className="rh-title">{project.name}</div>
          <div className="rh-sub">
            {project.description || "Redesign analysis"} · {personas.length} personas · {matrix.kpis.length} KPIs
          </div>
          <div className="rh-actions">
            <ExportPdfButton token={shareToken} />
            {shareToken && <ShareButton token={shareToken} />}
            <IntegrationButton provider="mural" projectId={project.id} icon="ti-external-link" label="Open in Mural" variant="hero" />
            <IntegrationButton provider="jira" projectId={project.id} icon="ti-ticket" label="Export to Jira" variant="hero" />
            <IntegrationButton provider="confluence" projectId={project.id} icon="ti-book" label="Publish to Confluence" variant="hero" />
          </div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div className="score-ring">
            <div className="score-n">{avgAfter}</div>
          </div>
          <div className="score-l">UX SCORE</div>
          <div className="score-delta">↑ from {avgBefore} before</div>
        </div>
      </div>

      <div className="report-grid">
        <div className="report-sec">
          <div className="rs-title">
            <i className="ti ti-layout-columns" /> Screen comparison
          </div>
          {editable && reportId ? (
            <AnnotatedComparison reportId={reportId} initial={annotations ?? {}} />
          ) : (
            <div className="report-grid" style={{ marginBottom: 0, gap: 8 }}>
              <ScreenThumb
                label="Before"
                tone="before"
                text={analysis?.before_summary}
                steps={analysis?.flow_diff?.total_steps_before}
              />
              <ScreenThumb
                label="After"
                tone="after"
                text={analysis?.after_summary}
                steps={analysis?.flow_diff?.total_steps_after}
              />
            </div>
          )}
        </div>

        <div className="report-sec">
          <div className="rs-title">
            <i className="ti ti-chart-bar" /> KPI comparison
          </div>
          <KPIBarChart kpis={chartKpis} />
        </div>
      </div>

      <div className="report-grid">
        <div className="report-sec">
          <div className="rs-title">
            <i className="ti ti-bulb" /> Top recommendations
          </div>
          <div className="reco-list">
            {top3[0] && (
              <Reco n={1}>
                Track real events post-launch to validate the +{top3[0].delta}pt {top3[0].name.toLowerCase()} prediction.
              </Reco>
            )}
            {highFriction ? (
              <Reco n={2}>
                Address a high-severity friction for{" "}
                {personas.find((p) => p.id === highFriction.r.persona_id)?.name ?? "a persona"}:{" "}
                {highFriction.f.description}.
              </Reco>
            ) : (
              <Reco n={2}>No high-severity frictions remain in the redesigned flow.</Reco>
            )}
            <Reco n={3}>
              Instrument the funnel and run a 2-week A/B against the legacy design before full rollout.
            </Reco>
          </div>
        </div>

        <div className="report-sec">
          <div className="rs-title">
            <i className="ti ti-users" /> Persona impact heatmap
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10 }}>
            UX score (after) per persona
          </div>
          {heat.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              Run synthetic tests to populate the heatmap.
            </div>
          ) : (
            heat.map((h) => (
              <div key={h.name} className="heatmap-row">
                <div className="hm-label">{h.name}</div>
                <div className="hm-track">
                  <div
                    className="hm-bar"
                    style={{ width: `${(h.score / 10) * 100}%`, background: h.score < 7 ? "#b8d4f0" : "var(--blue-light)" }}
                  >
                    <span className="hm-val">{h.score.toFixed(1)} / 10</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function ScreenThumb({
  label,
  tone,
  text,
  steps,
}: {
  label: string;
  tone: "before" | "after";
  text?: string | null;
  steps?: number;
}) {
  const after = tone === "after";
  return (
    <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 9, color: "var(--text3)", textAlign: "center", padding: "3px 6px", background: "var(--surface2)" }}>
        {label}{typeof steps === "number" ? ` · ${steps} steps` : ""}
      </div>
      <div
        style={{
          height: 92,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 4,
          padding: 8,
          background: after ? "linear-gradient(135deg,#c5dcf5,#a8c8ee)" : "linear-gradient(135deg,#e0e0e0,#c8c8c8)",
        }}
      >
        <i className="ti ti-layout-dashboard" style={{ fontSize: 18, color: after ? "var(--blue-text)" : "#888" }} />
        <div style={{ fontSize: 9, color: after ? "var(--blue-text)" : "#777", textAlign: "center", lineHeight: 1.3 }}>
          {text ? truncate(text, 70) : after ? "Redesigned flow" : "Legacy flow"}
        </div>
      </div>
    </div>
  );
}

function Reco({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="reco-item">
      <div className="rn">{n}</div>
      {children}
    </div>
  );
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);
