// GET /api/webhooks — list the user's webhook subscriptions.
// POST /api/webhooks — create a subscription { url, event_types[] }; a signing secret is generated.
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { listWebhooks, createWebhook, recordAudit } from "@/lib/db";
import { getCurrentUserIdOrNull } from "@/lib/auth";
import { readJson, badRequest, unauthorized } from "@/lib/http";
import { WEBHOOK_EVENTS } from "@/types/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  return NextResponse.json({ webhooks: await listWebhooks(userId) });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const body = await readJson<{ url?: string; event_types?: string[] }>(req);
  if (!body?.url || !/^https?:\/\//.test(body.url)) return badRequest("A valid https URL is required");
  const events = (body.event_types ?? []).filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e));
  const secret = randomBytes(24).toString("hex");
  try {
    const webhook = await createWebhook({ user_id: userId, url: body.url, event_types: events, secret });
    await recordAudit({ user_id: userId, action: "webhook.created", entity_type: "webhook", entity_id: webhook.id });
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && /relation|does not exist|schema/.test(e.message) ? "Run migration 0006 to enable webhooks." : "Could not create webhook" },
      { status: 400 },
    );
  }
}
