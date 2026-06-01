import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProject,
  listScreenshots,
  getLatestAnalysis,
  listPersonas,
  getKpiMatrixByProject,
  getReportByProject,
} from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { Badge, statusTone } from "@/components/ui/Badge";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) notFound();

  const userId = await getCurrentUserId();
  const [screenshots, analysis, allPersonas, kpi, report] = await Promise.all([
    listScreenshots(project.id),
    getLatestAnalysis(project.id),
    listPersonas(userId, project.id),
    getKpiMatrixByProject(project.id),
    getReportByProject(project.id),
  ]);
  const personas = allPersonas.filter((p) => p.project_id === project.id);

  const steps = [
    { href: "upload", icon: "ti-upload", title: "Upload screens", detail: `${screenshots.length} uploaded`, done: screenshots.length > 0 },
    { href: "personas", icon: "ti-users", title: "Personas", detail: `${personas.length} generated`, done: personas.length > 0 },
    { href: "testing", icon: "ti-test-pipe", title: "Synthetic testing", detail: analysis ? "analysis ready" : "needs analysis", done: !!analysis },
    { href: "kpi", icon: "ti-chart-bar", title: "KPI matrix", detail: kpi ? `${kpi.kpis.length} KPIs` : "not generated", done: !!kpi },
    { href: "report", icon: "ti-file-analytics", title: "Report", detail: report ? "ready" : "not generated", done: !!report },
  ];

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">{project.name}</div>
          <div className="section-sub">{project.description || "No description"}</div>
        </div>
        <Badge tone={statusTone(project.status)}>{project.status}</Badge>
      </div>

      <div className="proj-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {steps.map((s, i) => (
          <Link key={s.href} href={`/projects/${project.id}/${s.href}`} className="proj-card">
            <div className="proj-card-top">
              <div className="proj-icon" style={{ background: s.done ? "var(--green-light)" : "var(--surface2)" }}>
                <i className={`ti ${s.icon}`} style={{ color: s.done ? "var(--green-text)" : "var(--text3)" }} />
              </div>
              <div>
                <div className="proj-title">
                  {i + 1}. {s.title}
                </div>
                <div className="proj-meta">{s.detail}</div>
              </div>
            </div>
            <div className="proj-footer">
              {s.done ? (
                <Badge tone="done">
                  <i className="ti ti-check" style={{ fontSize: 10 }} /> Done
                </Badge>
              ) : (
                <Badge tone="draft">Pending</Badge>
              )}
              <span className="proj-info">
                Open <i className="ti ti-arrow-right" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
