import { listOrganisations, listUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminOrganisationsPage() {
  const [orgs, users] = await Promise.all([listOrganisations(), listUsers()]);
  const memberCount = (orgId: string) => users.filter((u) => u.org_id === orgId).length;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Organisations</div>
          <div className="section-sub">{orgs.length} organisation(s) · teams sharing projects and library</div>
        </div>
      </div>

      {orgs.length === 0 ? (
        <div className="card">
          <p style={{ fontSize: 13, color: "var(--text2)" }}>
            No organisations yet. They are created automatically per user once migration{" "}
            <span className="mono">0005_organisations.sql</span> is applied to the database.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--surface2)", color: "var(--text3)", textAlign: "left" }}>
                <th style={th}>Organisation</th>
                <th style={th}>Plan</th>
                <th style={th}>Members</th>
                <th style={th}>Monthly analyses</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={td}>
                    <div style={{ fontWeight: 500 }}>{o.name}</div>
                    {o.slug && <div style={{ color: "var(--text3)", fontSize: 11 }} className="mono">{o.slug}</div>}
                  </td>
                  <td style={td}>
                    <span className={`badge ${o.plan === "free" ? "b-draft" : "b-done"}`} style={{ textTransform: "capitalize" }}>
                      {o.plan}
                    </span>
                  </td>
                  <td style={td}>
                    <span className="mono">{memberCount(o.id)}</span> / {o.quota_users_max}
                  </td>
                  <td style={td}>
                    <span className="mono">{o.quota_analyses_per_month}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const th: React.CSSProperties = { padding: "10px 14px", fontWeight: 500 };
const td: React.CSSProperties = { padding: "10px 14px", verticalAlign: "middle" };
