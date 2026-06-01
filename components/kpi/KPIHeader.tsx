import type { KPIMatrix } from "@/types/kpi";

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// UX score: prefer the stored composite, else average the KPI scores (works pre-migration 0004).
export function KPIHeader({ matrix }: { matrix: KPIMatrix }) {
  const before = Math.round(matrix.ux_score_before ?? avg(matrix.kpis.map((k) => k.before_score)));
  const after = Math.round(matrix.ux_score_after ?? avg(matrix.kpis.map((k) => k.after_score)));
  const delta = after - before;
  const summary = matrix.kpis.slice(0, 4);

  return (
    <div className="kpi-header-row">
      <div className="kpi-score-big">
        <div className="ksb-lbl">UX Score</div>
        <div className="ksb-num">{after}</div>
        <div className="ksb-delta">
          {delta >= 0 ? "↑" : "↓"} {delta >= 0 ? "+" : ""}{delta} from baseline {before}
        </div>
      </div>
      <div className="kpi-summary">
        {summary.map((k) => {
          const d = Math.round(k.delta);
          const fillB = Math.max(0, Math.min(100, k.before_score));
          const fillA = Math.max(0, Math.min(100 - fillB, k.after_score - k.before_score));
          const up = k.delta_direction === "improvement";
          return (
            <div className="kpi-sum-row" key={k.id}>
              <span className="ksr-label">{k.name}</span>
              <div className="ksr-bar">
                <div style={{ display: "flex", height: "100%" }}>
                  <div className="ksr-fill-b" style={{ width: `${fillB}%` }} />
                  <div className="ksr-fill-a" style={{ width: `${fillA}%` }} />
                </div>
              </div>
              <span className="ksr-val">{Math.round(k.after_score)}</span>
              <span className={`ksr-delta ${up ? "ksr-up" : "ksr-dn"}`}>
                {d >= 0 ? "+" : ""}{d}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
