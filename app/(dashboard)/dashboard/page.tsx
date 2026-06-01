import Link from "next/link";
import {
  listProjects,
  listScreenshots,
  listPersonas,
  getReportByProject,
} from "@/lib/db";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth";
import { Badge, statusTone } from "@/components/ui/Badge";

const FLOW_ICON: Record<string, { icon: string; bg: string; color: string }> = {
  dashboard: { icon: "ti-layout-dashboard", bg: "var(--blue-light)", color: "var(--blue-text)" },
  settings: { icon: "ti-settings", bg: "var(--purple-light)", color: "var(--purple-text)" },
  form: { icon: "ti-forms", bg: "var(--teal-light)", color: "var(--teal-text)" },
  onboarding: { icon: "ti-rocket", bg: "var(--amber-light)", color: "var(--amber-text)" },
  navigation: { icon: "ti-compass", bg: "var(--blue-light)", color: "var(--blue-text)" },
  custom: { icon: "ti-square-rounded", bg: "var(--surface2)", color: "var(--text3)" },
};

function badgeLabel(status: string) {
  if (status === "completed") return (<><i className="ti ti-check" style={{ fontSize: 10 }} /> Completed</>);
  if (status === "processing" || status === "queued")
    return (<><i className="ti ti-loader" style={{ fontSize: 10 }} /> Processing</>);
  if (status === "failed") return "Failed";
  return "Draft";
}

export default async function DashboardPage() {
  const userId = getCurrentUserId();
  const user = await getCurrentUser();
  const projects = await listProjects(userId);
  const analysesRun = projects.filter((p) => p.status === "completed").length;
  const personaCount = (await listPersonas(userId)).filter((p) => !p.is_template).length;
  const quotaRemaining = user.quota_analyses - user.quota_used;

  // Per-project counts (resolved up front so the JSX stays synchronous).
  const cards = await Promise.all(
    projects.map(async (p) => ({
      project: p,
      screens: (await listScreenshots(p.id)).length,
      personas: (await listPersonas(userId, p.id)).filter((x) => x.project_id === p.id).length,
    })),
  );

  return (
    <>
      <div className="stat-grid">
        <Stat label="Total projects" value={projects.length} />
        <Stat label="Analyses run" value={analysesRun} />
        <Stat label="Personas generated" value={personaCount} />
        <Stat
          label="Quota remaining"
          value={quotaRemaining}
          delta={`${user.quota_used} used of ${user.quota_analyses}`}
          negative
        />
      </div>

      <div className="section-head">
        <div>
          <div className="section-title">Recent projects</div>
          <div className="section-sub">Click any project to open it</div>
        </div>
        <Link href="/projects/new" className="tb-btn">
          <i className="ti ti-plus" /> New
        </Link>
      </div>

      <div className="proj-grid">
        {cards.map(({ project: p, screens, personas }) => {
          const meta = FLOW_ICON[String(p.flow_type)] ?? FLOW_ICON.custom;
          return (
            <Link key={p.id} href={`/projects/${p.id}`} className="proj-card">
              <div className="proj-card-top">
                <div className="proj-icon" style={{ background: meta.bg }}>
                  <i className={`ti ${meta.icon}`} style={{ color: meta.color }} />
                </div>
                <div>
                  <div className="proj-title">{p.name}</div>
                  <div className="proj-meta">{p.description || "No description"}</div>
                </div>
              </div>
              <div className="proj-footer">
                <Badge tone={statusTone(p.status)}>{badgeLabel(p.status)}</Badge>
                <span className="proj-info">
                  <i className="ti ti-photo" /> {screens} screens · {personas} personas
                </span>
              </div>
            </Link>
          );
        })}

        <Link href="/projects/new" className="new-card">
          <i className="ti ti-plus" />
          <div className="new-card-title">Start new analysis</div>
          <div className="new-card-sub">Upload before + after screens to begin</div>
        </Link>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  delta,
  negative,
}: {
  label: string;
  value: number;
  delta?: string;
  negative?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {delta && <div className={`stat-delta ${negative ? "neg" : ""}`}>{delta}</div>}
    </div>
  );
}
