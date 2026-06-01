// PATCH /api/report/annotate — persist Konva annotation shapes for a report (spec §3 reports.annotations).
import { NextResponse } from "next/server";
import { getReport, updateReportAnnotations } from "@/lib/db";
import { readJson, badRequest } from "@/lib/http";
import type { AnnotationMap } from "@/types/report";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const body = await readJson<{ reportId?: string; annotations?: AnnotationMap }>(req);
  if (!body) return badRequest("Invalid JSON body");
  if (!body.reportId || !(await getReport(body.reportId))) {
    return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }
  const report = await updateReportAnnotations(body.reportId, body.annotations ?? {});
  return NextResponse.json({ report });
}
