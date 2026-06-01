import { initials, avatarTone } from "@/lib/utils/initials";
import type { Persona } from "@/types/persona";

const TECH: Record<Persona["tech_comfort"], { label: string; width: number }> = {
  low: { label: "Beginner", width: 35 },
  medium: { label: "Medium", width: 62 },
  high: { label: "Expert", width: 90 },
};

export function PersonaCard({ persona, index = 0 }: { persona: Persona; index?: number }) {
  const tech = TECH[persona.tech_comfort];
  return (
    <div className="persona-card">
      <div className="persona-header">
        <div className={`pa ${avatarTone(index)}`}>{initials(persona.name)}</div>
        <div>
          <div className="pa-name">{persona.name}</div>
          <div className="pa-role">{persona.occupation || "—"}</div>
        </div>
      </div>

      <div className="pa-attrs">
        {persona.age_range && (
          <div className="pa-attr">
            <span className="pa-k">Age</span>
            <span className="pa-v">{persona.age_range}</span>
          </div>
        )}
        {typeof persona.experience_years === "number" && (
          <div className="pa-attr">
            <span className="pa-k">Experience</span>
            <span className="pa-v">{persona.experience_years} yrs</span>
          </div>
        )}
        {persona.device_preference && (
          <div className="pa-attr">
            <span className="pa-k">Device</span>
            <span className="pa-v">{persona.device_preference}</span>
          </div>
        )}
      </div>

      {persona.behavioral_traits.length > 0 && (
        <div className="traits">
          {persona.behavioral_traits.slice(0, 4).map((t) => (
            <span key={t} className="trait">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="tech-lbl">
        <span>Tech comfort</span>
        <span>{tech.label}</span>
      </div>
      <div className="tech-track">
        <div className="tech-fill" style={{ width: `${tech.width}%` }} />
      </div>

      {persona.is_template && (
        <div style={{ marginTop: 8 }}>
          <span className="trait">Template</span>
        </div>
      )}
    </div>
  );
}
