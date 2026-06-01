import Link from "next/link";
import {
  listProjects,
  listPersonas,
  getKpiMatrixByProject,
} from "@/lib/db";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth";
import { KPIPreviewCard } from "@/components/dashboard/KPIPreviewCard";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const user = await getCurrentUser();
  const projects = await listProjects(userId);
  const analysesRun = projects.filter((p) => p.status === "completed").length;
  const personaCount = (await listPersonas(userId)).filter((p) => !p.is_template).length;
  const quotaRemaining = user.quota_analyses - user.quota_used;

  // Per-project KPI snapshot + persona count (resolved up front so the JSX stays synchronous).
  const cards = await Promise.all(
    projects.map(async (p) => ({
      project: p,
      matrix: (await getKpiMatrixByProject(p.id)) ?? undefined,
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
        {cards.map(({ project: p, matrix, personas }) => (
          <KPIPreviewCard key={p.id} project={p} matrix={matrix} personas={personas} />
        ))}

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
