import { notFound } from "next/navigation";
import { listScreenshots } from "@/lib/db";
import { getCurrentUserId, getOwnedProject } from "@/lib/auth";
import { StepRow } from "@/components/layout/StepRow";
import { ScreenshotUploader } from "@/components/upload/ScreenshotUploader";
import { AnalyzeButton } from "@/components/analysis/AnalyzeButton";
import { FigmaImportButton } from "@/components/upload/FigmaImportButton";
import { updateProjectSettings } from "./actions";

const FLOW_TYPES = ["dashboard", "onboarding", "settings", "form", "navigation", "custom"];

export default async function UploadPage({ params }: { params: { id: string } }) {
  const project = await getOwnedProject(params.id, await getCurrentUserId());
  if (!project) notFound();

  const screenshots = await listScreenshots(project.id);
  const before = screenshots.filter((s) => s.type === "before");
  const after = screenshots.filter((s) => s.type === "after");
  const canAnalyze = before.length > 0 && after.length > 0;

  return (
    <>
      <StepRow current="upload" />

      {/* Editable project setup (mockup shows these on the upload step) */}
      <form action={updateProjectSettings} className="card" style={{ marginBottom: 16 }}>
        <input type="hidden" name="projectId" value={project.id} />
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Project name</label>
            <input className="form-input" name="name" defaultValue={project.name} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Flow type</label>
            <select className="form-select capitalize" name="flow_type" defaultValue={String(project.flow_type)}>
              {FLOW_TYPES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
          <label className="form-label">Flow description <small>(what changed and why)</small></label>
          <textarea className="form-textarea" name="description" defaultValue={project.description ?? ""} />
        </div>
        <div className="inline-actions">
          <button type="submit" className="tb-btn"><i className="ti ti-device-floppy" /> Save settings</button>
        </div>
      </form>

      <div className="hint">
        <i className="ti ti-info-circle" />
        <div>
          Name files sequentially — <strong>01-login.png</strong>, <strong>02-dashboard.png</strong> —
          the tool reads order from filenames. Or import directly from Figma.
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <FigmaImportButton projectId={project.id} />
      </div>

      <div className="upload-grid">
        <ScreenshotUploader projectId={project.id} type="before" initial={before} />
        <ScreenshotUploader projectId={project.id} type="after" initial={after} />
      </div>

      <AnalyzeButton
        projectId={project.id}
        canAnalyze={canAnalyze}
        nextHref={`/projects/${project.id}/personas`}
      />
    </>
  );
}
