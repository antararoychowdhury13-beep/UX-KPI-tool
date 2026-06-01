// GET/PUT /api/models/assign/[projectId] — per-project AI model assignments (spec v3 §6).
import { NextResponse } from "next/server";
import { getModelAssignments, saveModelAssignments } from "@/lib/db";
import { getCurrentUserIdOrNull, getOwnedProject } from "@/lib/auth";
import { readJson, badRequest, unauthorized } from "@/lib/http";
import { DEFAULT_ASSIGNMENTS, type ModelAssignments } from "@/types/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  if (!(await getOwnedProject(params.projectId, userId))) return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  const assignments = (await getModelAssignments(params.projectId)) ?? DEFAULT_ASSIGNMENTS;
  return NextResponse.json({ assignments });
}

export async function PUT(req: Request, { params }: { params: { projectId: string } }) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  if (!(await getOwnedProject(params.projectId, userId))) return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  const body = await readJson<Partial<ModelAssignments>>(req);
  if (!body) return badRequest("Invalid JSON body");
  const merged: ModelAssignments = { ...DEFAULT_ASSIGNMENTS, ...body, method_overrides: body.method_overrides ?? {} };
  await saveModelAssignments(params.projectId, merged);
  return NextResponse.json({ ok: true, assignments: merged });
}
