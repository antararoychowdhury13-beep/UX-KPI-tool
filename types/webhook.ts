// Webhook subscriptions (spec v2 §3). Outbound HMAC-signed POSTs on events.
export const WEBHOOK_EVENTS = [
  "analysis.completed",
  "testing.completed",
  "kpi.ready",
  "report.ready",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookSubscription {
  id: string;
  user_id: string;
  event_types: string[];
  url: string;
  secret: string;
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
}
