import { notFound } from "next/navigation";
import {
  getLatestAnalysis,
  getKpiMatrixByProject,
  getReportByProject,
  listReportsByProject,
  listPersonas,
  listTestResults,
} from "@/lib/db";
import { getCurrentUserId, getOwnedProject } from "@/lib/auth";
import { StepRow } from "@/components/layout/StepRow";
import { ReportDashboard } from "@/components/report/ReportDashboard";
import { ReportVersions } from "@/components/report/ReportVersions";
import { GenerateReportButton } from "@/components/report/GenerateReportButton";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { v?: string };
}) {
  const userId = await getCurrentUserId();
  const project = await getOwnedProject(params.id, userId);
  if (!project) notFound();

  const requestedVersion = searchParams.v ? Number(searchParams.v) : undefined;
  const [matrix, analysis, report, allReports, allPersonas, testResults] = await Promise.all([
    getKpiMatrixByProject(project.id),
    getLatestAnalysis(project.id),
    getReportByProject(project.id, requestedVersion),
    listReportsByProject(project.id),
    listPersonas(userId, project.id),
    listTestResults(project.id),
  ]);
  const personas = allPersonas.filter((p) => p.project_id === project.id);
  const versions = allReports.map((r) => r.version ?? 1);

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
        <>
          <ReportVersions projectId={project.id} versions={versions} current={report.version ?? 1} />

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
            version={report.version ?? 1}
            editable
          />
        </>
      )}
    </>
  );
}
