// Core analysis job: run Gemini vision over before/after screenshots and persist an analysis row.
// Invoked inline (mock mode) or by the BullMQ worker (when Redis is configured).
import {
  createAnalysis,
  getProject,
  listScreenshots,
  updateJob,
  updateProjectStatus,
} from "@/lib/db";
import { analyzeScreens, type InlineImage } from "@/lib/ai/gemini";
import type { FlowDiff } from "@/types/project";

export async function processAnalysis(
  projectId: string,
  jobId: string,
): Promise<void> {
  const startedAt = Date.now();
  const project = getProject(projectId);
  if (!project) {
    updateJob(jobId, { status: "failed", error: "Project not found" });
    return;
  }

  updateJob(jobId, { status: "processing" });
  updateProjectStatus(projectId, "processing");

  try {
    const screenshots = listScreenshots(projectId);
    const before = screenshots.filter((s) => s.type === "before");
    const after = screenshots.filter((s) => s.type === "after");

    // In mock mode there are no real image bytes; the Gemini wrapper ignores empty arrays.
    // When real storage is wired, download bytes here and pass as InlineImage[].
    const beforeImages: InlineImage[] = [];
    const afterImages: InlineImage[] = [];

    const raw = await analyzeScreens({
      flowDescription: project.description ?? "",
      flowType: String(project.flow_type),
      beforeImages: beforeImages.length ? beforeImages : padImages(before.length),
      afterImages: afterImages.length ? afterImages : padImages(after.length),
    });

    const flow_diff: FlowDiff = {
      total_steps_before: raw.total_steps_before,
      total_steps_after: raw.total_steps_after,
      key_changes: raw.key_changes,
      friction_points_removed: raw.friction_points_removed,
      new_capabilities_added: raw.new_capabilities_added,
    };

    const analysis = createAnalysis({
      project_id: projectId,
      status: "completed",
      before_summary: raw.before_flow_summary,
      after_summary: raw.after_flow_summary,
      flow_diff,
      raw_gemini_response: raw,
      processing_time_ms: Date.now() - startedAt,
    });

    updateJob(jobId, { status: "completed", analysis_id: analysis.id });
    updateProjectStatus(projectId, "completed");
  } catch (err) {
    updateJob(jobId, {
      status: "failed",
      error: err instanceof Error ? err.message : "Analysis failed",
    });
    updateProjectStatus(projectId, "failed");
  }
}

// Placeholder so the mock analyzer still receives a count when no real bytes exist.
function padImages(count: number): InlineImage[] {
  return Array.from({ length: count }, () => ({ mimeType: "image/png", data: "" }));
}
