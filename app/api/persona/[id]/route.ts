// GET  /api/persona/[id] — persona detail.
// PATCH /api/persona/[id] — { action: "saveToLibrary" } copies the persona into the user's library
//   (project_id = null) while leaving the project's copy intact.
import { NextResponse } from "next/server";
import { getPersona, addPersonas, deletePersona, recordAudit } from "@/lib/db";
import { getCurrentUserIdOrNull } from "@/lib/auth";
import { readJson, badRequest, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const persona = await getPersona(params.id);
  // Only the owner (or a global template) can view the detail.
  if (!persona || (persona.user_id !== userId && !persona.is_template)) {
    return NextResponse.json({ error: "Unknown persona" }, { status: 404 });
  }
  return NextResponse.json({ persona });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const body = await readJson<{ action?: string }>(req);
  if (!body) return badRequest("Invalid JSON body");

  if (body.action === "saveToLibrary") {
    const original = await getPersona(params.id);
    if (!original || (original.user_id !== userId && !original.is_template)) {
      return NextResponse.json({ error: "Unknown persona" }, { status: 404 });
    }
    // Copy into the library (project_id null) so the project keeps its persona too.
    const { id: _id, created_at: _c, ...rest } = original;
    const [copy] = await addPersonas([{ ...rest, user_id: userId, project_id: null, is_template: false }]);
    return NextResponse.json({ persona: copy }, { status: 201 });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const ok = await deletePersona(params.id, userId);
  if (!ok) return NextResponse.json({ error: "Unknown persona" }, { status: 404 });
  try { await recordAudit({ user_id: userId, action: "persona.deleted", entity_type: "persona", entity_id: params.id }); } catch {}
  return NextResponse.json({ ok: true });
}
