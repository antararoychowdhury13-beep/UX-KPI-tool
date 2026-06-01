// GET  /api/persona/[id] — persona detail.
// PATCH /api/persona/[id] — { action: "saveToLibrary" } detaches the persona into the user library.
import { NextResponse } from "next/server";
import { getPersona, saveToLibrary } from "@/lib/db";
import { getCurrentUserIdOrNull } from "@/lib/auth";
import { readJson, badRequest, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const persona = await getPersona(params.id);
  if (!persona) {
    return NextResponse.json({ error: "Unknown persona" }, { status: 404 });
  }
  return NextResponse.json({ persona });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!(await getCurrentUserIdOrNull())) return unauthorized();
  const body = await readJson<{ action?: string }>(req);
  if (!body) return badRequest("Invalid JSON body");
  const { action } = body;
  if (action === "saveToLibrary") {
    const persona = await saveToLibrary(params.id);
    if (!persona) {
      return NextResponse.json({ error: "Unknown persona" }, { status: 404 });
    }
    return NextResponse.json({ persona });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
