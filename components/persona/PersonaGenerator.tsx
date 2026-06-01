"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FlowContext } from "@/types/flow";

const TRAITS = [
  "Risk-averse",
  "Detail-oriented",
  "Impatient",
  "Power user",
  "Accessibility needs",
  "Keyboard-first",
  "Enterprise admin",
  "Mobile-first",
  "Slow adopter",
];

const INDUSTRIES = [
  "Enterprise Software",
  "Finance",
  "Healthcare",
  "E-commerce",
  "Telecom",
  "Manufacturing",
  "Other",
];

// Map the AI's tech-comfort vocabulary (beginner/intermediate/advanced/expert) to this builder's
// select values. Multiple distinct recommendations → "Mixed".
function mapTechComfort(rec?: string[]): string | null {
  if (!rec || rec.length === 0) return null;
  const uniq = Array.from(new Set(rec.map((r) => r.toLowerCase())));
  if (uniq.length > 1) return "low to high";
  const one = uniq[0];
  if (one.startsWith("begin")) return "low";
  if (one.startsWith("inter")) return "medium";
  if (one.startsWith("adv") || one.startsWith("exp")) return "high";
  return null;
}

const AGE_OPTIONS = ["26–35", "36–45", "46–55"];
// AI returns "36-45" (hyphen); the select uses an en-dash. Normalise before matching.
function mapAgeRange(rec?: string[]): string | null {
  if (!rec || rec.length === 0) return null;
  for (const r of rec) {
    const norm = r.replace(/[-–—]/g, "–").trim();
    if (AGE_OPTIONS.includes(norm)) return norm;
  }
  return null;
}

export function PersonaGenerator({
  projectId,
  hasPersonas,
}: {
  projectId: string;
  hasPersonas: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(5);
  const [selected, setSelected] = useState<string[]>([
    "Risk-averse",
    "Detail-oriented",
    "Power user",
    "Enterprise admin",
  ]);
  const [ageRange, setAgeRange] = useState("36–45");
  const [techComfort, setTechComfort] = useState("low to high");
  const [industry, setIndustry] = useState("Enterprise Software");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flow-context analysis (spec v2 §6, Prompt 0)
  const [analyzing, setAnalyzing] = useState(false);
  const [flow, setFlow] = useState<FlowContext | null>(null);
  // Extra trait chips surfaced by the flow analysis that aren't in the default list.
  const [extraTraits, setExtraTraits] = useState<string[]>([]);

  const allTraits = Array.from(new Set([...TRAITS, ...extraTraits]));

  function toggle(trait: string) {
    setSelected((s) => (s.includes(trait) ? s.filter((t) => t !== trait) : [...s, trait]));
  }

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
      const tc = mapTechComfort(ctx.recommended_tech_comfort);
      if (tc) setTechComfort(tc);
      const age = mapAgeRange(ctx.recommended_age_ranges);
      if (age) setAgeRange(age);
      const rec = (ctx.recommended_behavioral_traits ?? []).filter(Boolean);
      if (rec.length) {
        const recExtra = rec.filter((t) => !TRAITS.includes(t));
        if (recExtra.length) setExtraTraits((e) => Array.from(new Set([...e, ...recExtra])));
        setSelected((s) => Array.from(new Set([...s, ...rec])));
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
        productType: industry,
        demographics: ageRange,
        traits: selected.join(", "),
        techComfort,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Generation failed");
    else router.refresh();
    setBusy(false);
  }

  return (
    <div className="persona-config">
      {/* AI flow-context analysis */}
      <div className="form-row" style={{ marginBottom: 12, alignItems: "flex-end" }}>
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
        <div className="form-group" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
          <button className="tb-btn" onClick={analyseFlow} disabled={analyzing} style={{ width: "100%", justifyContent: "center" }}>
            <i className={`ti ${analyzing ? "ti-loader-2" : "ti-sparkles"}`} />
            {analyzing ? "Analysing flow…" : "Analyse flow"}
          </button>
        </div>
      </div>

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

      <div className="form-row" style={{ marginBottom: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            Number of personas <small>({count})</small>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Tech comfort level</label>
          <select className="form-select" value={techComfort} onChange={(e) => setTechComfort(e.target.value)}>
            <option value="low to high">Mixed (all levels)</option>
            <option value="high">High (expert users)</option>
            <option value="medium">Medium</option>
            <option value="low">Low (beginners)</option>
          </select>
        </div>
      </div>

      <div className="form-row" style={{ marginBottom: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Age range</label>
          <select className="form-select" value={ageRange} onChange={(e) => setAgeRange(e.target.value)}>
            {AGE_OPTIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }} />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">
          Behavioral traits <small>(tap to select)</small>
        </label>
        <div className="tag-selector">
          {allTraits.map((t) => (
            <span
              key={t}
              className={`tag-sel ${selected.includes(t) ? "selected" : ""}`}
              onClick={() => toggle(t)}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

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
