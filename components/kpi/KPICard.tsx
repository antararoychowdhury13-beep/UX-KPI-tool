import type { KPI } from "@/types/kpi";

export function KPICard({ kpi }: { kpi: KPI }) {
  const improved = kpi.delta_direction === "improvement";
  const regressed = kpi.delta_direction === "regression";

  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <div className="kpi-name">{kpi.name}</div>
        <span className={`kpi-cat kcat-${kpi.category}`}>{kpi.category.replace("_", " ")}</span>
        <span className={`conf conf-${kpi.confidence_level}`}>
          {kpi.confidence_level === "high" && <i className="ti ti-check" style={{ fontSize: 9 }} />}
          {kpi.confidence_level} confidence
        </span>
      </div>

      <div className="kpi-bars-row">
        <div className="bar-grp">
          <div className="bar-lbl">
            Before <b>{kpi.before_score}</b>
          </div>
          <div className="bar-track">
            <div className="bar-fill-b" style={{ width: `${clamp(kpi.before_score)}%` }} />
          </div>
        </div>
        <div className="bar-grp">
          <div className="bar-lbl">
            After <b>{kpi.after_score}</b>
          </div>
          <div className="bar-track">
            <div className="bar-fill-a" style={{ width: `${clamp(kpi.after_score)}%` }} />
          </div>
        </div>
      </div>

      <div className="kpi-bottom">
        <div className={`delta ${regressed ? "delta-d" : "delta-u"}`}>
          <i className={`ti ti-arrow-${improved ? "up" : regressed ? "down" : "right"}`} style={{ fontSize: 11 }} />
          {kpi.delta > 0 ? "+" : ""}
          {kpi.delta} pts
        </div>
        <div className="delta-hint">{kpi.reasoning}</div>
      </div>
    </div>
  );
}

function clamp(n: number) {
  return Math.min(100, Math.max(0, n));
}
