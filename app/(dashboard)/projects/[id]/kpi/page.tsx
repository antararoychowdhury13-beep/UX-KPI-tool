import Link from "next/link";
import { notFound } from "next/navigation";
import { getLatestAnalysis, getKpiMatrixByProject } from "@/lib/db";
import { getCurrentUserId, getOwnedProject } from "@/lib/auth";
import { StepRow } from "@/components/layout/StepRow";
import { KPIMatrix } from "@/components/kpi/KPIMatrix";
import { KPIHeader } from "@/components/kpi/KPIHeader";
import { GenerateKpiButton } from "@/components/kpi/GenerateKpiButton";
import { ExportCsvButton } from "@/components/kpi/ExportCsvButton";

export default async function KpiPage({ params }: { params: { id: string } }) {
  const project = await getOwnedProject(params.id, await getCurrentUserId());
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
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>
            Ready to generate from your personas{analysis ? ", the screenshot analysis," : ""} and synthetic
            test results.
            {!analysis && (
              <span style={{ display: "block", marginTop: 6, fontSize: 12, color: "var(--text3)" }}>
                Optional: upload before/after screens and run the analysis for richer, screen-level KPIs.
              </span>
            )}
          </p>
          <GenerateKpiButton projectId={project.id} />
        </div>
      ) : (
        <>
          <KPIHeader matrix={matrix} />
          <KPIMatrix kpis={matrix.kpis} />
        </>
      )}
    </>
  );
}
