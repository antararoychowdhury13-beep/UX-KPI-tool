"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(trait: string) {
    setSelected((s) => (s.includes(trait) ? s.filter((t) => t !== trait) : [...s, trait]));
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
            <option>26–35</option>
            <option>36–45</option>
            <option>46–55</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }} />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">
          Behavioral traits <small>(tap to select)</small>
        </label>
        <div className="tag-selector">
          {TRAITS.map((t) => (
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
