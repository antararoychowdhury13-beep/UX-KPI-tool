"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { initials, avatarTone } from "@/lib/utils/initials";
import type { Persona } from "@/types/persona";

const ROLE_LABELS: Record<string, string> = {
  junior: "Junior", mid: "Mid-level", senior: "Senior", lead: "Lead", manager: "Manager", director: "Director",
};

function techDisplay(p: Persona): { label: string; width: number } {
  const score =
    typeof p.tech_comfort_score === "number"
      ? p.tech_comfort_score
      : p.tech_comfort === "high" ? 9 : p.tech_comfort === "medium" ? 6 : 3;
  const label = score <= 3 ? "Beginner" : score <= 6 ? "Intermediate" : score <= 8 ? "Advanced" : "Expert";
  return { label: `${label} (${score}/10)`, width: Math.max(8, Math.min(100, score * 10)) };
}

function genderAge(p: Persona): string | null {
  const g = p.gender ? p.gender.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  const age = typeof p.age === "number" ? p.age : null;
  if (g && age) return `${g}, ${age}`;
  return g ?? (age ? String(age) : null);
}

export function PersonaCard({ persona, index = 0 }: { persona: Persona; index?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inLibrary = persona.project_id === null;

  const tech = techDisplay(persona);
  const ga = genderAge(persona);
  const roleLevel = persona.role_level ? ROLE_LABELS[persona.role_level] ?? persona.role_level : null;
  const attrs: Array<[string, string]> = [];
  if (typeof persona.experience_years === "number") attrs.push(["Experience", `${persona.experience_years} yrs`]);
  if (persona.device_preference) attrs.push(["Device", persona.device_preference.replace(/_/g, " ")]);
  if (roleLevel) attrs.push(["Role level", roleLevel]);
  if (persona.location) attrs.push(["Location", persona.location]);
  if (attrs.length === 0 && persona.age_range) attrs.push(["Age", persona.age_range]);

  async function save(e: React.MouseEvent) {
    e.stopPropagation();
    setSaving(true);
    const res = await fetch(`/api/persona/${persona.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveToLibrary" }),
    });
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <>
      <div className="persona-card" onClick={() => setOpen(true)} style={{ cursor: "pointer" }}>
        <div className="persona-header">
          <div className={`pa ${avatarTone(index)}`}>{initials(persona.name)}</div>
          <div>
            <div className="pa-name">{persona.name}</div>
            <div className="pa-role">{persona.occupation || "—"}</div>
            {ga && <div className="pa-gender">{ga}</div>}
          </div>
        </div>

        {attrs.length > 0 && (
          <div className="pa-attrs">
            {attrs.map(([k, v]) => (
              <div className="pa-attr" key={k}>
                <span className="pa-k">{k}</span>
                <span className="pa-v">{v}</span>
              </div>
            ))}
          </div>
        )}

        {persona.behavioral_traits.length > 0 && (
          <div className="traits">
            {persona.behavioral_traits.slice(0, 4).map((t) => (
              <span key={t} className="trait">{t}</span>
            ))}
          </div>
        )}

        <div className="pc-tech">
          <div className="tech-lbl"><span>Tech comfort</span><span>{tech.label}</span></div>
          <div className="tech-track"><div className="tech-fill" style={{ width: `${tech.width}%` }} /></div>
        </div>

        {persona.motivation_quote && <div className="pa-motivation">&ldquo;{persona.motivation_quote}&rdquo;</div>}

        <div className="pc-actions" onClick={(e) => e.stopPropagation()}>
          {persona.is_template ? (
            <span className="pc-chip"><i className="ti ti-template" /> Template</span>
          ) : inLibrary ? (
            <span className="pc-chip"><i className="ti ti-bookmark" /> In library</span>
          ) : saved ? (
            <span className="pc-chip done"><i className="ti ti-check" /> Saved to library</span>
          ) : (
            <button className="pc-act" onClick={save} disabled={saving}>
              <i className={`ti ${saving ? "ti-loader-2" : "ti-bookmark-plus"}`} /> {saving ? "Saving…" : "Save to library"}
            </button>
          )}
          <button className="pc-act" onClick={() => setOpen(true)}><i className="ti ti-eye" /> View detail</button>
        </div>
      </div>

      {open && <PersonaDetailModal persona={persona} index={index} onClose={() => setOpen(false)} />}
    </>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="pd-row">
      <span className="pd-k">{label}</span>
      <span className="pd-v">{value}</span>
    </div>
  );
}

function PersonaDetailModal({ persona, index, onClose }: { persona: Persona; index: number; onClose: () => void }) {
  const tech = techDisplay(persona);
  return (
    <div className="overlay open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 520 }}>
        <div className="mhd">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={`pa ${avatarTone(index)}`}>{initials(persona.name)}</div>
            <div>
              <div className="mhd-t">{persona.name}</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>{persona.occupation || "—"}{persona.location ? ` · ${persona.location}` : ""}</div>
            </div>
          </div>
          <i className="ti ti-x mhd-close" onClick={onClose} />
        </div>
        <div className="mbody" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <div className="pd-grid">
            <Row label="Age" value={persona.age ?? persona.age_range} />
            <Row label="Gender" value={persona.gender?.replace(/_/g, " ")} />
            <Row label="Role level" value={persona.role_level ? ROLE_LABELS[persona.role_level] ?? persona.role_level : null} />
            <Row label="Experience" value={typeof persona.experience_years === "number" ? `${persona.experience_years} yrs` : null} />
            <Row label="Device" value={persona.device_preference?.replace(/_/g, " ")} />
            <Row label="Tech comfort" value={tech.label} />
            <Row label="Accessibility" value={persona.accessibility_profile && persona.accessibility_profile !== "none" ? persona.accessibility_profile.replace(/_/g, " ") : null} />
            <Row label="Occupation detail" value={persona.occupation_detail} />
          </div>

          {persona.behavioral_traits.length > 0 && (
            <div className="pd-block">
              <div className="pd-lbl">Behavioural traits</div>
              <div className="traits" style={{ margin: 0 }}>
                {persona.behavioral_traits.map((t) => <span key={t} className="trait">{t}</span>)}
              </div>
            </div>
          )}
          {persona.motivation_quote && (
            <div className="pd-block"><div className="pd-lbl">Motivation</div><p className="pd-quote">&ldquo;{persona.motivation_quote}&rdquo;</p></div>
          )}
          {persona.goals && <div className="pd-block"><div className="pd-lbl">Goals</div><p className="pd-text">{persona.goals}</p></div>}
          {persona.frustrations && <div className="pd-block"><div className="pd-lbl">Frustrations</div><p className="pd-text">{persona.frustrations}</p></div>}
        </div>
      </div>
    </div>
  );
}
