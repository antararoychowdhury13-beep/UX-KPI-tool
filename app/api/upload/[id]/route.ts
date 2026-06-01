// DELETE /api/upload/[id]?projectId=… — remove a single uploaded screenshot (+ its storage object).
import { NextResponse } from "next/server";
import { deleteScreenshot } from "@/lib/db";
import { removeScreenshot } from "@/lib/storage";
import { getCurrentUserIdOrNull, getOwnedProject } from "@/lib/auth";
import { unauthorized, badRequest } from "@/lib/http";

export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return badRequest("projectId is required");
  if (!(await getOwnedProject(projectId, userId))) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }
  const path = await deleteScreenshot(params.id, projectId);
  if (path) await removeScreenshot(path);
  return NextResponse.json({ ok: true });
}
