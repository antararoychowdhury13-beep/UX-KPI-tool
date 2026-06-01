// POST /api/report/generate — assemble a report from the project's latest KPI matrix.
import { NextResponse } from "next/server";
import { getKpiMatrixByProject, createReport } from "@/lib/db";
import { getCurrentUserIdOrNull, getOwnedProject } from "@/lib/auth";
import { readJson, badRequest, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const body = await readJson<{ projectId?: string }>(req);
  if (!body) return badRequest("Invalid JSON body");
  const { projectId } = body;
  if (!projectId || !(await getOwnedProject(projectId, userId))) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  const matrix = await getKpiMatrixByProject(projectId);
  if (!matrix) {
    return NextResponse.json(
      { error: "Generate a KPI matrix before creating a report" },
      { status: 400 },
    );
  }

  const report = await createReport({ project_id: projectId, kpi_matrix_id: matrix.id });
  return NextResponse.json({ report }, { status: 201 });
}
