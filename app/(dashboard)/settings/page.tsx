import { getCurrentUser, getCurrentOrg } from "@/lib/auth";
import { listAIServices, listOrgMembers } from "@/lib/db";
import { initials } from "@/lib/utils/initials";
import { hasSupabase, hasRedis } from "@/lib/config";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const org = await getCurrentOrg();
  const members = org ? await listOrgMembers(org.id) : [];
  // Derive AI services from the managed list (same source as the admin panel) so they stay in sync.
  const aiServices: Array<[string, boolean]> = listAIServices().map((s) => [
    s.name,
    !!(s.env_var && process.env[s.env_var]),
  ]);
  const services: Array<[string, boolean]> = [
    ["Supabase (data/auth/storage)", hasSupabase],
    ...aiServices,
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
          <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>
            Quota: {user.quota_used} / {user.quota_analyses} analyses
          </div>
          <SignOutButton />
        </div>

        {org && (
          <div className="card">
            <div className="rs-title">
              <i className="ti ti-building" /> Organisation
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{org.name}</div>
              <span className={`badge ${org.plan === "free" ? "b-proc" : "b-done"}`} style={{ textTransform: "capitalize" }}>
                {org.plan}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text3)" }}>Members</span>
                <span>{members.length} / {org.quota_users_max}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text3)" }}>Monthly analyses</span>
                <span>{org.quota_analyses_per_month}</span>
              </div>
            </div>
            {members.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8 }}>Team members</div>
                {members.slice(0, 6).map((m) => (
                  <div key={m.id} className="user-row" style={{ marginBottom: 6 }}>
                    <div className="user-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(m.full_name ?? m.email)}</div>
                    <div>
                      <div className="user-name" style={{ fontSize: 12 }}>{m.full_name ?? m.email}</div>
                      <div className="user-role" style={{ fontSize: 10 }}>{m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
