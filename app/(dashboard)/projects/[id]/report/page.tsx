import { notFound } from "next/navigation";
import {
  getProject,
  getLatestAnalysis,
  getKpiMatrixByProject,
  getReportByProject,
  listPersonas,
  listTestResults,
} from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { StepRow } from "@/components/layout/StepRow";
import { ReportDashboard } from "@/components/report/ReportDashboard";
import { GenerateReportButton } from "@/components/report/GenerateReportButton";

export default function ReportPage({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  if (!project) notFound();

  const userId = getCurrentUserId();
  const matrix = getKpiMatrixByProject(project.id);
  const analysis = getLatestAnalysis(project.id);
  const report = getReportByProject(project.id);
  const personas = listPersonas(userId, project.id).filter((p) => p.project_id === project.id);
  const testResults = listTestResults(project.id);

  return (
    <>
      <StepRow current="report" />

      {!matrix ? (
        <div className="hint">
          <i className="ti ti-alert-triangle" />
          <div>Generate a KPI matrix first — the report is built from it.</div>
        </div>
      ) : !report ? (
        <div className="card">
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>
            Assemble a shareable UX impact report from the KPI matrix, analysis, and persona tests.
          </p>
          <GenerateReportButton projectId={project.id} />
        </div>
      ) : (
        <ReportDashboard
          project={project}
          analysis={analysis ?? null}
          matrix={matrix}
          personas={personas}
          testResults={testResults}
          generatedAt={report.created_at}
          shareToken={report.share_token}
          reportId={report.id}
          annotations={report.annotations}
          editable
        />
      )}
    </>
  );
}
