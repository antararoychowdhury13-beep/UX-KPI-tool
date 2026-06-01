import Link from "next/link";
import { Badge, statusTone } from "@/components/ui/Badge";
import type { Project } from "@/types/project";
import type { KPIMatrix, KPICategory } from "@/types/kpi";

const CAT_COLOR: Record<KPICategory, string> = {
  efficiency: "var(--blue)",
  error_reduction: "var(--red)",
  learnability: "var(--teal)",
  accessibility: "var(--purple)",
  satisfaction: "var(--green)",
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function badgeLabel(status: string) {
  if (status === "completed") return (<><i className="ti ti-check" style={{ fontSize: 10 }} /> Completed</>);
  if (status === "processing" || status === "queued" || status === "testing" || status === "analyzing")
    return (<><i className="ti ti-loader" style={{ fontSize: 10 }} /> Processing</>);
  if (status === "failed") return "Failed";
  return "Draft";
}

export function KPIPreviewCard({
  project,
  matrix,
  personas,
}: {
  project: Project;
  matrix?: KPIMatrix;
  personas: number;
}) {
  const after = matrix
    ? Math.round(matrix.ux_score_after ?? avg(matrix.kpis.map((k) => k.after_score)))
    : null;
  const before = matrix
    ? Math.round(matrix.ux_score_before ?? avg(matrix.kpis.map((k) => k.before_score)))
    : null;
  const topKpis = matrix ? matrix.kpis.slice(0, 4) : [];
  const processing = ["processing", "queued", "testing", "analyzing"].includes(String(project.status));

  return (
    <Link href={`/projects/${project.id}`} className="kpi-preview-card">
      <div className="kpc-header">
        <div style={{ minWidth: 0 }}>
          <div className="kpc-proj">{project.name}</div>
          <div className="kpc-sub">{project.description || "No description"}</div>
        </div>
        {after !== null && (
          <div className="score-pill">
            <div>
              <div className="sp-num">{after}</div>
              {before !== null && <div className="sp-delta">↑{after - before} from {before}</div>}
            </div>
          </div>
        )}
      </div>

      {matrix ? (
        <div className="kpi-mini-list">
          {topKpis.map((k) => {
            const d = Math.round(k.delta);
            const up = k.delta_direction === "improvement";
            return (
              <div className="kml-row" key={k.id}>
                <span className="kml-name">{k.name}</span>
                <div className="kml-bar-wrap">
                  <div className="kml-bar" style={{ width: `${Math.max(4, Math.min(100, k.after_score))}%`, background: CAT_COLOR[k.category] ?? "var(--blue)" }} />
                </div>
                <span className="kml-val">{Math.round(k.after_score)}%</span>
                <span className={`kml-delta ${up ? "kml-up" : "kml-dn"}`}>{d >= 0 ? "+" : ""}{d}{up ? "↑" : "↓"}</span>
              </div>
            );
          })}
        </div>
      ) : processing ? (
        <div className="prog-wrap" style={{ margin: "8px 0" }}>
          <div className="prog-header"><span>Analysis in progress</span><b>…</b></div>
          <div className="prog-track"><div className="prog-fill" style={{ width: "60%" }} /></div>
        </div>
      ) : null}

      <div className="kpc-footer">
        <Badge tone={statusTone(project.status)}>{badgeLabel(project.status)}</Badge>
        <span className="kpc-foot-meta">
          {matrix
            ? `${personas} personas · ${Math.round(matrix.overall_confidence * 100)}% confidence`
            : `${personas} personas`}
        </span>
      </div>
    </Link>
  );
}
