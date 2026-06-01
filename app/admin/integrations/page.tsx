import { hasMural, hasFigma, hasJira, hasConfluence } from "@/lib/config";

const INTEGRATIONS = [
  {
    name: "Mural",
    icon: "ti-layout-board",
    desc: "Export annotated before/after boards to a Mural workspace.",
    direction: "Export",
    env: "MURAL_API_KEY",
    docs: "https://developers.mural.co/",
  },
  {
    name: "Figma",
    icon: "ti-brand-figma",
    desc: "Import redesigned screens directly from Figma files.",
    direction: "Import",
    env: "FIGMA_ACCESS_TOKEN",
    docs: "https://www.figma.com/developers/api",
  },
  {
    name: "Jira",
    icon: "ti-ticket",
    desc: "Push recommendations and frictions as Jira issues.",
    direction: "Export",
    env: "JIRA_BASE_URL + JIRA_API_TOKEN",
    docs: "https://developer.atlassian.com/cloud/jira/",
  },
  {
    name: "Confluence",
    icon: "ti-book",
    desc: "Publish the UX impact report as a Confluence page.",
    direction: "Export",
    env: "CONFLUENCE_API_TOKEN",
    docs: "https://developer.atlassian.com/cloud/confluence/",
  },
];

export default function AdminIntegrationsPage() {
  const connected: Record<string, boolean> = {
    Mural: hasMural,
    Figma: hasFigma,
    Jira: hasJira,
    Confluence: hasConfluence,
  };

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Integrations</div>
          <div className="section-sub">Connect external tools (Phase 3)</div>
        </div>
      </div>

      <div className="hint">
        <i className="ti ti-info-circle" />
        <div>
          <strong>Shareable report links</strong> are already live (no setup needed). The
          integrations below are scaffolded — each activates once its credentials are set in the
          environment. OAuth/connect flows are wired per provider in a follow-up.
        </div>
      </div>

      <div className="proj-grid">
        {INTEGRATIONS.map((i) => {
          const on = connected[i.name];
          return (
            <div key={i.name} className="card">
              <div className="proj-card-top">
                <div className="proj-icon" style={{ background: on ? "var(--green-light)" : "var(--surface2)" }}>
                  <i className={`ti ${i.icon}`} style={{ color: on ? "var(--green-text)" : "var(--text3)" }} />
                </div>
                <div>
                  <div className="proj-title">
                    {i.name} <span style={{ fontSize: 10, color: "var(--text3)" }}>· {i.direction}</span>
                  </div>
                  <div className="proj-meta">{i.desc}</div>
                </div>
              </div>
              <div className="proj-footer">
                <span className={`badge ${on ? "b-done" : "b-draft"}`}>
                  {on ? "Connected" : "Not connected"}
                </span>
                <span className="proj-info mono" style={{ fontSize: 10 }}>{i.env}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
