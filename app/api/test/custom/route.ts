// GET/POST /api/test/custom — custom evaluation criteria for a project (spec v3 §6).
import { NextResponse } from "next/server";
import { listCustomTests, createCustomTest, recordAudit } from "@/lib/db";
import { getCurrentUserIdOrNull, getOwnedProject } from "@/lib/auth";
import { readJson, badRequest, unauthorized } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId || !(await getOwnedProject(projectId, userId))) return NextResponse.json({ tests: [] });
  return NextResponse.json({ tests: await listCustomTests(projectId) });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const body = await readJson<{ projectId?: string; name?: string; description?: string; ai_model?: string; scope?: string }>(req);
  if (!body?.projectId || !body.name) return badRequest("projectId and name are required");
  if (!(await getOwnedProject(body.projectId, userId))) return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  try {
    const test = await createCustomTest({
      user_id: userId,
      project_id: body.projectId,
      name: body.name,
      description: body.description ?? "Custom evaluation",
      ai_model: body.ai_model ?? "claude-sonnet-4",
      scope: body.scope ?? "all_personas",
    });
    await recordAudit({ user_id: userId, action: "custom_test.created", entity_type: "custom_test", entity_id: test.id });
    return NextResponse.json({ test }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && /relation|does not exist|schema/.test(e.message) ? "Run migration 0007 to save custom tests." : "Could not create custom test" },
      { status: 400 },
    );
  }
}
