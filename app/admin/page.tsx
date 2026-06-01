import { adminStats, listApiUsage, listAIServices } from "@/lib/db";
import { hasSupabase } from "@/lib/config";

export default function AdminOverviewPage() {
  const stats = adminStats();
  const usage = listApiUsage(8);
  const services = listAIServices();

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Overview</div>
          <div className="section-sub">System-wide usage and health</div>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="Users" value={stats.users} />
        <Stat label="Projects" value={stats.projects} />
        <Stat label="Analyses run" value={stats.analyses} />
        <Stat label="API calls logged" value={stats.apiCalls} />
      </div>

      <div className="report-grid">
        <div className="card">
          <div className="rs-title"><i className="ti ti-plug-connected" /> AI services</div>
          {services.map((s) => {
            const live = !!(s.env_var && process.env[s.env_var]);
            return (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "6px 0", borderTop: "1px solid var(--border)" }}>
                <span>{s.name}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  <span className={`badge ${live ? "b-done" : "b-proc"}`}>{live ? "live" : "mock"}</span>
                  <span className={`badge ${s.enabled ? "b-done" : "b-fail"}`}>{s.enabled ? "enabled" : "disabled"}</span>
                </span>
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
            Supabase: <span className={`badge ${hasSupabase ? "b-done" : "b-proc"}`}>{hasSupabase ? "live" : "mock"}</span>
          </div>
        </div>

        <div className="card">
          <div className="rs-title"><i className="ti ti-history" /> Recent API usage</div>
          {usage.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              No API calls yet. Run an analysis or generate personas.
            </div>
          ) : (
            usage.map((u) => (
              <div key={u.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "5px 0", borderTop: "1px solid var(--border)" }}>
                <span style={{ textTransform: "capitalize" }}>{u.service} · {u.endpoint}</span>
                <span className={`badge ${u.status === "success" ? "b-done" : "b-fail"}`}>{u.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
