export default function AdminReportTemplatesPage() {
  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Report templates</div>
          <div className="section-sub">Reusable report layouts and section presets</div>
        </div>
      </div>
      <div className="card empty">
        <i className="ti ti-file-text" style={{ fontSize: 28, color: "var(--text3)" }} />
        <div style={{ fontSize: 13, fontWeight: 500 }}>One default template</div>
        <div style={{ fontSize: 12, color: "var(--text3)", maxWidth: 360 }}>
          Reports currently use the built-in layout (hero, screen comparison, KPI chart,
          recommendations, persona heatmap). Custom templates are a future enhancement.
        </div>
      </div>
    </>
  );
}
