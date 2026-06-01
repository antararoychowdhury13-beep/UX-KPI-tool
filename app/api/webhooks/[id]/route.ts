// PATCH /api/webhooks/[id] — toggle active / update; DELETE — remove (scoped to the user).
import { NextResponse } from "next/server";
import { updateWebhook, deleteWebhook, recordAudit } from "@/lib/db";
import { getCurrentUserIdOrNull } from "@/lib/auth";
import { readJson, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const body = (await readJson<{ is_active?: boolean; url?: string; event_types?: string[] }>(req)) ?? {};
  await updateWebhook(params.id, userId, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  await deleteWebhook(params.id, userId);
  await recordAudit({ user_id: userId, action: "webhook.deleted", entity_type: "webhook", entity_id: params.id });
  return NextResponse.json({ ok: true });
}
