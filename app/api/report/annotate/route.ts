// PATCH /api/report/annotate — persist Konva annotation shapes for a report (spec §3 reports.annotations).
import { NextResponse } from "next/server";
import { getReport, updateReportAnnotations } from "@/lib/db";
import { getCurrentUserIdOrNull, getOwnedProject } from "@/lib/auth";
import { readJson, badRequest, unauthorized } from "@/lib/http";
import type { AnnotationMap } from "@/types/report";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const body = await readJson<{ reportId?: string; annotations?: AnnotationMap }>(req);
  if (!body) return badRequest("Invalid JSON body");
  const report = body.reportId ? await getReport(body.reportId) : undefined;
  // Verify the report's project belongs to the user (prevents annotating others' reports).
  if (!report || !(await getOwnedProject(report.project_id, userId))) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }
  const updated = await updateReportAnnotations(report.id, body.annotations ?? {});
  return NextResponse.json({ report: updated });
}
