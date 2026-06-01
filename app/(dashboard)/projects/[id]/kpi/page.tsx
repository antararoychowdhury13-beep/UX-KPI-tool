import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getLatestAnalysis, getKpiMatrixByProject } from "@/lib/db";
import { StepRow } from "@/components/layout/StepRow";
import { KPIMatrix } from "@/components/kpi/KPIMatrix";
import { GenerateKpiButton } from "@/components/kpi/GenerateKpiButton";
import { ExportCsvButton } from "@/components/kpi/ExportCsvButton";

export default async function KpiPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();

  const [analysis, matrix] = await Promise.all([
    getLatestAnalysis(project.id),
    getKpiMatrixByProject(project.id),
  ]);

  return (
    <>
      <StepRow current="kpi" />

      <div className="section-head">
        <div>
          <div className="section-title">KPI matrix</div>
          <div className="section-sub">
            {matrix
              ? `AI-inferred UX metrics · ${Math.round(matrix.overall_confidence * 100)}% overall confidence`
              : "Synthesize measurable KPIs from the analysis and tests"}
          </div>
        </div>
        {matrix && (
          <div style={{ display: "flex", gap: 7 }}>
            <ExportCsvButton kpis={matrix.kpis} />
            <Link href={`/projects/${project.id}/report`} className="tb-btn primary">
              <i className="ti ti-file-analytics" /> Build report
            </Link>
          </div>
        )}
      </div>

      {!matrix ? (
        <div className="card">
          {!analysis ? (
            <div className="hint" style={{ marginBottom: 14 }}>
              <i className="ti ti-alert-triangle" />
              <div>Run the screenshot analysis (Upload step) before generating KPIs.</div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>
              Ready to generate. This uses the latest analysis, personas, and any synthetic test
              results.
            </p>
          )}
          <GenerateKpiButton projectId={project.id} />
        </div>
      ) : (
        <KPIMatrix kpis={matrix.kpis} />
      )}
    </>
  );
}
