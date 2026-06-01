import { StepRow } from "@/components/layout/StepRow";
import { createProjectAction } from "./actions";

const FLOW_TYPES = ["dashboard", "onboarding", "settings", "form", "navigation", "custom"];
const INDUSTRIES = ["Enterprise Software", "Finance", "Healthcare", "E-commerce", "Custom"];

export default function NewProjectPage() {
  return (
    <form action={createProjectAction}>
      <StepRow current="setup" />

      <div className="form-row">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Project name</label>
          <input className="form-input" name="name" required placeholder="HMC Dashboard Revamp" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Flow type</label>
          <select className="form-select capitalize" name="flow_type" defaultValue="dashboard">
            {FLOW_TYPES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Industry</label>
          <select className="form-select" name="industry" defaultValue="Enterprise Software">
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            Number of personas <small>(to generate later)</small>
          </label>
          <select className="form-select" name="persona_count" defaultValue="5">
            {[3, 5, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: 14 }}>
        <label className="form-label">
          Flow description <small>(what changed and why)</small>
        </label>
        <textarea
          className="form-textarea"
          name="description"
          placeholder="Describe the flow and what changed in the redesign. e.g. Migrating from a legacy panel framework to React, consolidating action menus into a unified command bar."
        />
      </div>

      <div className="hint">
        <i className="ti ti-info-circle" />
        <div>
          Next you&apos;ll upload screenshots. Name files sequentially:{" "}
          <strong>01-login.png, 02-dashboard.png</strong> — the tool reads order from filenames.
        </div>
      </div>

      <div className="inline-actions">
        <button type="submit" className="tb-btn primary">
          <i className="ti ti-arrow-right" /> Create &amp; upload screens
        </button>
      </div>
    </form>
  );
}
