import { listPersonas } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { PersonaCard } from "@/components/persona/PersonaCard";

export default async function AdminPersonaTemplatesPage() {
  // Global templates available to all users (is_template = true).
  const templates = (await listPersonas(getCurrentUserId())).filter((p) => p.is_template);

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Persona templates</div>
          <div className="section-sub">Global templates available to every user</div>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="card empty">
          <i className="ti ti-id-badge-2" style={{ fontSize: 28, color: "var(--text3)" }} />
          <div style={{ fontSize: 13 }}>No templates yet</div>
        </div>
      ) : (
        <div className="persona-grid">
          {templates.map((p, i) => (
            <PersonaCard key={p.id} persona={p} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
