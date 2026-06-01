import { listAuditLog, listUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

const ACTION_TONE: Record<string, string> = {
  created: "b-done",
  generated: "b-done",
  deleted: "b-fail",
  updated: "b-proc",
};

export default async function AdminAuditLogPage() {
  const [entries, users] = await Promise.all([listAuditLog(150), listUsers()]);
  const userName = (id: string | null) => users.find((u) => u.id === id)?.full_name ?? users.find((u) => u.id === id)?.email ?? "—";

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Audit log</div>
          <div className="section-sub">{entries.length} recent action(s)</div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="card">
          <p style={{ fontSize: 13, color: "var(--text2)" }}>
            No audit entries yet. Actions are recorded once migration{" "}
            <span className="mono">0006_v2_collab.sql</span> is applied.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--surface2)", color: "var(--text3)", textAlign: "left" }}>
                <th style={th}>Action</th>
                <th style={th}>Entity</th>
                <th style={th}>User</th>
                <th style={th}>When</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const verb = e.action.split(".")[1] ?? "";
                return (
                  <tr key={e.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={td}>
                      <span className={`badge ${ACTION_TONE[verb] ?? "b-draft"}`} style={{ fontFamily: '"DM Mono", monospace' }}>{e.action}</span>
                    </td>
                    <td style={td}>
                      <span style={{ color: "var(--text3)" }}>{e.entity_type ?? "—"}</span>
                    </td>
                    <td style={td}>{userName(e.user_id)}</td>
                    <td style={td}>
                      <span style={{ color: "var(--text3)" }}>{new Date(e.created_at).toLocaleString()}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const th: React.CSSProperties = { padding: "10px 14px", fontWeight: 500 };
const td: React.CSSProperties = { padding: "10px 14px", verticalAlign: "middle" };
