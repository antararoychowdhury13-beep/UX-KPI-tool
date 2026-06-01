import { listUsers } from "@/lib/db";
import { initials } from "@/lib/utils/initials";
import { QuotaEditor } from "@/components/admin/QuotaEditor";

export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Users &amp; quota</div>
          <div className="section-sub">{users.length} user(s) · manage analysis quotas</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--surface2)", color: "var(--text3)", textAlign: "left" }}>
              <th style={th}>User</th>
              <th style={th}>Role</th>
              <th style={th}>Used</th>
              <th style={th}>Quota</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="user-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                      {initials(u.full_name ?? "U")}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{u.full_name}</div>
                      <div style={{ color: "var(--text3)", fontSize: 11 }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={td}>
                  <span className={`badge ${u.role === "admin" ? "b-done" : "b-draft"}`}>{u.role}</span>
                </td>
                <td style={td}>
                  <span className="mono">{u.quota_used}</span>
                </td>
                <td style={td}>
                  <QuotaEditor userId={u.id} quota={u.quota_analyses} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const th: React.CSSProperties = { padding: "10px 14px", fontWeight: 500 };
const td: React.CSSProperties = { padding: "10px 14px", verticalAlign: "middle" };
