// Outbound webhook delivery (spec v2 §3). Signs the JSON body with HMAC-SHA256 using each
// subscription's secret and POSTs to its URL. Best-effort: failures never block the request,
// and missing tables (pre-migration 0006) just yield no subscriptions.
import { createHmac } from "crypto";
import { listWebhooks, markWebhookTriggered } from "@/lib/db";
import type { WebhookEvent } from "@/types/webhook";

export async function deliverWebhooks(
  userId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  let subs;
  try {
    subs = await listWebhooks(userId);
  } catch {
    return;
  }
  const matching = subs.filter(
    (s) => s.is_active && (s.event_types.length === 0 || s.event_types.includes(event)),
  );
  if (matching.length === 0) return;

  const body = JSON.stringify({ event, payload, sent_at: new Date().toISOString() });

  await Promise.allSettled(
    matching.map(async (s) => {
      const signature = createHmac("sha256", s.secret).update(body).digest("hex");
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(s.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-UXKPI-Event": event,
            "X-UXKPI-Signature": `sha256=${signature}`,
          },
          body,
          signal: controller.signal,
        });
        clearTimeout(t);
        await markWebhookTriggered(s.id, res.ok);
      } catch {
        await markWebhookTriggered(s.id, false);
      }
    }),
  );
}
