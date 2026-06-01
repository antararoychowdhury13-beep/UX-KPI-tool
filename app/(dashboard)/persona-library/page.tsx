import { listPersonas } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { PersonaCard } from "@/components/persona/PersonaCard";
import { NewPersonaButton } from "@/components/persona/NewPersonaButton";

export default async function PersonaLibraryPage() {
  const personas = (await listPersonas(await getCurrentUserId())).filter((p) => p.project_id === null);

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Persona library</div>
          <div className="section-sub">{personas.length} saved · reusable across projects · click any to view detail</div>
        </div>
        <NewPersonaButton />
      </div>

      {personas.length === 0 ? (
        <div className="card empty">
          <i className="ti ti-users" style={{ fontSize: 28, color: "var(--text3)" }} />
          <div style={{ fontSize: 13, fontWeight: 500 }}>No saved personas yet</div>
          <div style={{ fontSize: 12, color: "var(--text3)", maxWidth: 320 }}>
            Generate personas inside a project and save them here to reuse later.
          </div>
        </div>
      ) : (
        <div className="persona-grid">
          {personas.map((p, i) => (
            <PersonaCard key={p.id} persona={p} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
