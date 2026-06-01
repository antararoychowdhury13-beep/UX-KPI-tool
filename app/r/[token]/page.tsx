import { notFound } from "next/navigation";
import {
  getReportByShareToken,
  getProject,
  getKpiMatrixByProject,
  getLatestAnalysis,
  listPersonas,
  listTestResults,
} from "@/lib/db";
import { ReportDashboard } from "@/components/report/ReportDashboard";

// Public, no-login report view (acceptance: share link works without login).
export default async function PublicReportPage({ params }: { params: { token: string } }) {
  const report = await getReportByShareToken(params.token);
  if (!report) notFound();

  const [project, matrix, analysis] = await Promise.all([
    getProject(report.project_id),
    getKpiMatrixByProject(report.project_id),
    getLatestAnalysis(report.project_id),
  ]);
  if (!project || !matrix) notFound();
  const personas = (await listPersonas(project.user_id, report.project_id)).filter(
    (p) => p.project_id === report.project_id,
  );
  const testResults = await listTestResults(report.project_id);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 24px", fontSize: 13, fontWeight: 600 }}>
          UX KPI Tool <span style={{ fontWeight: 400, fontSize: 11, color: "var(--text3)", marginLeft: 8 }}>shared report</span>
        </div>
      </header>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
        <ReportDashboard
          project={project}
          analysis={analysis ?? null}
          matrix={matrix}
          personas={personas}
          testResults={testResults}
          generatedAt={report.created_at}
          shareToken={report.share_token}
        />
      </main>
    </div>
  );
}
