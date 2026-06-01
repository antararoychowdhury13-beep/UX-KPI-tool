import Link from "next/link";
import { notFound } from "next/navigation";
import { listPersonas } from "@/lib/db";
import { getCurrentUserId, getOwnedProject } from "@/lib/auth";
import { StepRow } from "@/components/layout/StepRow";
import { PersonaCard } from "@/components/persona/PersonaCard";
import { PersonaGenerator } from "@/components/persona/PersonaGenerator";
import { activeModelInfo } from "@/lib/ai/providers";

export default async function PersonasPage({ params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  const project = await getOwnedProject(params.id, userId);
  if (!project) notFound();

  const personas = (await listPersonas(userId, project.id)).filter((p) => p.project_id === project.id);

  return (
    <>
      <StepRow current="personas" />

      <div className="section-head">
        <div>
          <div className="section-title">Persona builder</div>
          <div className="section-sub">Configure and generate synthetic user personas</div>
        </div>
        {personas.length > 0 && (
          <Link href={`/projects/${project.id}/testing`} className="tb-btn primary">
            <i className="ti ti-test-pipe" /> Run synthetic tests
          </Link>
        )}
      </div>

      <PersonaGenerator projectId={project.id} hasPersonas={personas.length > 0} model={activeModelInfo()} />

      {personas.length > 0 && (
        <>
          <div className="divider" />
          <div className="section-head" style={{ marginBottom: 12 }}>
            <div className="section-title">Generated personas</div>
          </div>
          <div className="persona-grid">
            {personas.map((p, i) => (
              <PersonaCard key={p.id} persona={p} index={i} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
