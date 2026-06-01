"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FlowContext } from "@/types/flow";
import { AiProgress, useStepProgress, type AiStep } from "@/components/ai/AiProgress";
import { ModelBadge } from "@/components/ai/ModelBadge";

const FLOW_STEPS: AiStep[] = [
  { chip: "reading context", label: "Reading flow description" },
  { chip: "identifying roles", label: "Identifying user roles from context" },
  { chip: "mapping demographics", label: "Mapping enterprise persona archetypes" },
  { chip: "assigning traits", label: "Assigning demographic + behavioural traits" },
];
const PERSONA_STEPS: AiStep[] = [
  { chip: "reading config", label: "Reading flow description and persona config" },
  { chip: "mapping roles", label: "Mapping enterprise roles to demographics" },
  { chip: "adding traits", label: "Assigning behavioural traits and tech comfort" },
  { chip: "writing backstories", label: "Writing persona backstories and motivations" },
];

const AGES = ["18–25", "26–35", "36–45", "46–55", "55+"];
const GENDERS = ["Male", "Female", "Non-binary", "Mixed"];
const ROLES = ["Junior", "Mid-level", "Senior", "Lead", "Manager", "Director"];
const TECH = ["Beginner", "Intermediate", "Advanced", "Expert"];
const ACCESS = ["None", "Visual impairment", "Motor difficulty", "Cognitive load"];
const TRAITS = [
  "Risk-averse",
  "Detail-oriented",
  "Impatient",
  "Power user",
  "Slow adopter",
  "Keyboard-first",
  "Enterprise admin",
  "Multi-tasker",
  "Procedure-follower",
  "Shortcut seeker",
  "Mobile-first",
];
const INDUSTRIES = ["Enterprise Software", "Finance", "Healthcare", "E-commerce", "Telecom", "Manufacturing", "Other"];

function ChipGroup({
  icon,
  label,
  options,
  selected,
  onToggle,
}: {
  icon: string;
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="cfg-item">
      <div className="cfg-lbl">
        <i className={`ti ${icon}`} /> {label}
      </div>
      <div className="tag-selector">
        {options.map((o) => (
          <span key={o} className={`tag-sel ${selected.includes(o) ? "selected" : ""}`} onClick={() => onToggle(o)}>
            {o}
          </span>
        ))}
      </div>
    </div>
  );
}

// Normalise a hyphenated AI age range ("36-45") to the en-dash chips ("36–45").
const normAge = (s: string) => s.replace(/[-–—]/g, "–").trim();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ROLE_MAP: Record<string, string> = {
  junior: "Junior", mid: "Mid-level", "mid-level": "Mid-level", senior: "Senior",
  lead: "Lead", manager: "Manager", director: "Director",
};

export function PersonaGenerator({
  projectId,
  hasPersonas,
  model,
}: {
  projectId: string;
  hasPersonas: boolean;
  model: { label: string; model: string } | null;
}) {
  const router = useRouter();
  const [count, setCount] = useState(5);
  const [industry, setIndustry] = useState("Enterprise Software");
  const [ages, setAges] = useState<string[]>(["36–45", "46–55"]);
  const [genders, setGenders] = useState<string[]>(["Male", "Female", "Mixed"]);
  const [roles, setRoles] = useState<string[]>(["Mid-level", "Senior"]);
  const [tech, setTech] = useState<string[]>(["Intermediate", "Advanced", "Expert"]);
  const [access, setAccess] = useState<string[]>(["None"]);
  const [traits, setTraits] = useState<string[]>(["Risk-averse", "Detail-oriented", "Power user", "Enterprise admin"]);
  const [extraTraits, setExtraTraits] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [flow, setFlow] = useState<FlowContext | null>(null);

  const flowProg = useStepProgress(FLOW_STEPS.length, analyzing);
  const genProg = useStepProgress(PERSONA_STEPS.length, busy);

  const allTraits = Array.from(new Set([...TRAITS, ...extraTraits]));
  const toggler = (set: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    set((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));

  async function analyseFlow() {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/flow/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, industry }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Flow analysis failed");
        return;
      }
      const ctx: FlowContext = data.context;
      setFlow(ctx);
      // Pre-fill config from the recommendations (user can still override anything).
      const recAges = (ctx.recommended_age_ranges ?? []).map(normAge).filter((a) => AGES.includes(a));
      if (recAges.length) setAges(recAges);
      const recRoles = (ctx.recommended_role_levels ?? []).map((r) => ROLE_MAP[r.toLowerCase()] ?? cap(r)).filter((r) => ROLES.includes(r));
      if (recRoles.length) setRoles(recRoles);
      const recTech = (ctx.recommended_tech_comfort ?? []).map(cap).filter((t) => TECH.includes(t));
      if (recTech.length) setTech(recTech);
      const recTraits = (ctx.recommended_behavioral_traits ?? []).filter(Boolean);
      if (recTraits.length) {
        const extra = recTraits.filter((t) => !TRAITS.includes(t));
        if (extra.length) setExtraTraits((e) => Array.from(new Set([...e, ...extra])));
        setTraits((s) => Array.from(new Set([...s, ...recTraits])));
      }
    } catch {
      setError("Flow analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/persona/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        count,
        industry,
        productType: industry,
        demographics: ages.join(", "),
        genders: genders.join(", "),
        roleLevels: roles.join(", "),
        accessibility: access.join(", "),
        techComfort: tech.join(", "),
        traits: traits.join(", "),
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Generation failed");
    else {
      // The route analyses the project brief during generation; surface that
      // insight if the user generated directly without running "Analyse flow".
      if (data.flowContext) setFlow(data.flowContext as FlowContext);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="persona-engine">
      <div className="pe-head">
        <div className="pe-ai-icon">
          <i className="ti ti-brain" />
        </div>
        <div style={{ flex: 1 }}>
          <div className="pe-title">AI Persona Engine</div>
          <div className="pe-sub">Reads your flow description and auto-configures relevant personas</div>
        </div>
        <ModelBadge model={model} />
        <button className="tb-btn" onClick={analyseFlow} disabled={analyzing}>
          <i className={`ti ${analyzing ? "ti-loader-2" : "ti-scan"}`} />
          {analyzing ? "Analysing…" : "Analyse flow"}
        </button>
      </div>

      {analyzing && (
        <div style={{ marginBottom: 14 }}>
          <AiProgress steps={FLOW_STEPS} step={flowProg.step} progress={flowProg.progress} tone="cyan" />
        </div>
      )}

      {flow && (
        <div className="flow-insight">
          <div className="fi-title">
            <i className="ti ti-bulb" /> Flow analysis
          </div>
          <p className="fi-summary">{flow.flow_summary}</p>
          {flow.key_tensions && flow.key_tensions.length > 0 && (
            <ul className="fi-tensions">
              {flow.key_tensions.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          )}
          {flow.persona_diversity_note && <p className="fi-note">{flow.persona_diversity_note}</p>}
          <div className="fi-applied">
            <i className="ti ti-circle-check" /> Recommended demographics, traits and tech comfort applied below — adjust as needed.
          </div>
        </div>
      )}

      <div className="form-row" style={{ marginBottom: 14 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            Number of personas <small>({count})</small>
          </label>
          <input type="range" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: "100%" }} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Industry context</label>
          <select className="form-select" value={industry} onChange={(e) => setIndustry(e.target.value)}>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="config-grid">
        <ChipGroup icon="ti-calendar" label="Age range" options={AGES} selected={ages} onToggle={toggler(setAges)} />
        <ChipGroup icon="ti-gender-bigender" label="Gender" options={GENDERS} selected={genders} onToggle={toggler(setGenders)} />
        <ChipGroup icon="ti-briefcase" label="Role level" options={ROLES} selected={roles} onToggle={toggler(setRoles)} />
        <ChipGroup icon="ti-device-laptop" label="Tech comfort" options={TECH} selected={tech} onToggle={toggler(setTech)} />
        <ChipGroup icon="ti-accessible" label="Accessibility" options={ACCESS} selected={access} onToggle={toggler(setAccess)} />
        <ChipGroup icon="ti-brain" label="Behavioural traits" options={allTraits} selected={traits} onToggle={toggler(setTraits)} />
      </div>

      {busy && (
        <div style={{ marginTop: 14 }}>
          <AiProgress steps={PERSONA_STEPS} step={genProg.step} progress={genProg.progress} tone="green" />
        </div>
      )}

      <div className="inline-actions">
        {error && <span style={{ fontSize: 11, color: "var(--red-text)", marginRight: "auto" }}>{error}</span>}
        <button className="tb-btn primary" onClick={generate} disabled={busy}>
          <i className="ti ti-wand" />
          {busy ? "Generating…" : hasPersonas ? `Regenerate ${count} personas` : `Generate ${count} personas`}
        </button>
      </div>
    </div>
  );
}
