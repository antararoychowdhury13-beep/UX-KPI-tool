// POST /api/upload — register before/after screenshots for a project.
// Accepts multipart form-data: projectId, type ('before'|'after'), files[].
// In mock mode we store metadata only (file_path is a placeholder); when Supabase Storage is
// wired, upload bytes to the `project-screenshots` bucket and store the returned path.
import { NextResponse } from "next/server";
import { getProject, addScreenshots } from "@/lib/db";
import { uploadScreenshot } from "@/lib/storage";
import { parseSequence, parseScreenLabel, isAcceptedImage } from "@/lib/utils/fileNaming";
import type { ScreenshotType } from "@/types/project";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const projectId = String(form.get("projectId") ?? "");
  const type = String(form.get("type") ?? "") as ScreenshotType;

  if (!projectId || !(await getProject(projectId))) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }
  if (type !== "before" && type !== "after") {
    return NextResponse.json({ error: "type must be 'before' or 'after'" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const rejected = files.filter((f) => !isAcceptedImage(f.type));
  if (rejected.length) {
    return NextResponse.json(
      { error: `Unsupported file type(s): ${rejected.map((f) => f.name).join(", ")}` },
      { status: 415 },
    );
  }

  const rows = await Promise.all(
    files.map(async (f, i) => {
      const seq = parseSequence(f.name) ?? i + 1;
      const bytes = new Uint8Array(await f.arrayBuffer());
      const file_path = await uploadScreenshot(projectId, type, seq, f.name, bytes, f.type);
      return {
        project_id: projectId,
        type,
        sequence_order: seq,
        file_name: f.name,
        file_path,
        screen_label: parseScreenLabel(f.name) || null,
      };
    }),
  );

  const screenshots = await addScreenshots(rows);
  return NextResponse.json({ screenshots }, { status: 201 });
}
