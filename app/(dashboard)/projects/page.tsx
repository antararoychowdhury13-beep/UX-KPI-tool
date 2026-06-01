import Link from "next/link";
import { listProjects, listScreenshots, listPersonas } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { Badge, statusTone } from "@/components/ui/Badge";

const FLOW_ICON: Record<string, { icon: string; bg: string; color: string }> = {
  dashboard: { icon: "ti-layout-dashboard", bg: "var(--blue-light)", color: "var(--blue-text)" },
  settings: { icon: "ti-settings", bg: "var(--purple-light)", color: "var(--purple-text)" },
  form: { icon: "ti-forms", bg: "var(--teal-light)", color: "var(--teal-text)" },
  onboarding: { icon: "ti-rocket", bg: "var(--amber-light)", color: "var(--amber-text)" },
  navigation: { icon: "ti-compass", bg: "var(--blue-light)", color: "var(--blue-text)" },
  custom: { icon: "ti-square-rounded", bg: "var(--surface2)", color: "var(--text3)" },
};

export default function ProjectsPage() {
  const userId = getCurrentUserId();
  const projects = listProjects(userId);
  const counts = {
    completed: projects.filter((p) => p.status === "completed").length,
    processing: projects.filter((p) => p.status === "processing").length,
    draft: projects.filter((p) => p.status === "draft").length,
  };

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">All projects</div>
          <div className="section-sub">
            {projects.length} total · {counts.completed} completed · {counts.processing} processing ·{" "}
            {counts.draft} draft
          </div>
        </div>
        <Link href="/projects/new" className="tb-btn primary">
          <i className="ti ti-plus" /> New Project
        </Link>
      </div>

      <div className="proj-grid">
        {projects.map((p) => {
          const meta = FLOW_ICON[String(p.flow_type)] ?? FLOW_ICON.custom;
          const screens = listScreenshots(p.id).length;
          const personas = listPersonas(userId, p.id).filter((x) => x.project_id === p.id).length;
          return (
            <Link key={p.id} href={`/projects/${p.id}`} className="proj-card">
              <div className="proj-card-top">
                <div className="proj-icon" style={{ background: meta.bg }}>
                  <i className={`ti ${meta.icon}`} style={{ color: meta.color }} />
                </div>
                <div>
                  <div className="proj-title">{p.name}</div>
                  <div className="proj-meta">
                    {p.description || "No description"} · {personas} personas · {screens} screens
                  </div>
                </div>
              </div>
              <div className="proj-footer">
                <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                <span className="proj-info capitalize">{String(p.flow_type)}</span>
              </div>
            </Link>
          );
        })}

        <Link href="/projects/new" className="new-card">
          <i className="ti ti-plus" />
          <div className="new-card-title">Start new project</div>
          <div className="new-card-sub">Upload screens to begin analysis</div>
        </Link>
      </div>
    </>
  );
}
