import { initials, avatarTone } from "@/lib/utils/initials";
import type { Persona } from "@/types/persona";

const ROLE_LABELS: Record<string, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead",
  manager: "Manager",
  director: "Director",
};

// Tech-comfort label + bar width. Prefer the numeric 1-10 score; fall back to the bucket.
function techDisplay(p: Persona): { label: string; width: number } {
  const score =
    typeof p.tech_comfort_score === "number"
      ? p.tech_comfort_score
      : p.tech_comfort === "high"
        ? 9
        : p.tech_comfort === "medium"
          ? 6
          : 3;
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
  const tech = techDisplay(persona);
  const ga = genderAge(persona);
  const roleLevel = persona.role_level ? ROLE_LABELS[persona.role_level] ?? persona.role_level : null;
  const attrs: Array<[string, string]> = [];
  if (typeof persona.experience_years === "number") attrs.push(["Experience", `${persona.experience_years} yrs`]);
  if (persona.device_preference) attrs.push(["Device", persona.device_preference.replace(/_/g, " ")]);
  if (roleLevel) attrs.push(["Role level", roleLevel]);
  if (persona.location) attrs.push(["Location", persona.location]);
  if (attrs.length === 0 && persona.age_range) attrs.push(["Age", persona.age_range]);

  return (
    <div className="persona-card">
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
            <span key={t} className="trait">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="pc-tech">
        <div className="tech-lbl">
          <span>Tech comfort</span>
          <span>{tech.label}</span>
        </div>
        <div className="tech-track">
          <div className="tech-fill" style={{ width: `${tech.width}%` }} />
        </div>
      </div>

      {persona.motivation_quote && <div className="pa-motivation">&ldquo;{persona.motivation_quote}&rdquo;</div>}

      {persona.is_template && (
        <div style={{ marginTop: 8 }}>
          <span className="trait">Template</span>
        </div>
      )}
    </div>
  );
}
