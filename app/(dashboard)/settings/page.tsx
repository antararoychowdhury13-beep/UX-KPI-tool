import { getCurrentUser } from "@/lib/auth";
import { initials } from "@/lib/utils/initials";
import { hasSupabase, hasAnthropic, hasGemini, hasHuggingFace, hasRedis } from "@/lib/config";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const services: Array<[string, boolean]> = [
    ["Supabase (data/auth/storage)", hasSupabase],
    ["Anthropic Claude", hasAnthropic],
    ["Google Gemini", hasGemini],
    ["HuggingFace", hasHuggingFace],
    ["Upstash Redis (queue)", hasRedis],
  ];

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Settings</div>
          <div className="section-sub">Account and connected services</div>
        </div>
      </div>

      <div className="report-grid">
        <div className="card">
          <div className="rs-title">
            <i className="ti ti-user" /> Account
          </div>
          <div className="user-row" style={{ marginBottom: 10 }}>
            <div className="user-avatar">{initials(user.full_name ?? "U")}</div>
            <div>
              <div className="user-name">{user.full_name}</div>
              <div className="user-role">{user.email}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>
            Quota: {user.quota_used} / {user.quota_analyses} analyses
          </div>
        </div>

        <div className="card">
          <div className="rs-title">
            <i className="ti ti-plug" /> Connected services
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10 }}>
            Each service runs live when its env vars are set, otherwise a local mock is used.
          </div>
          {services.map(([name, on]) => (
            <div
              key={name}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderTop: "1px solid var(--border)" }}
            >
              <span>{name}</span>
              <span className={`badge ${on ? "b-done" : "b-proc"}`}>{on ? "live" : "mock"}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
