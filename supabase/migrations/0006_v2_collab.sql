-- v2 collaboration: notifications, audit log, webhooks, report versioning (spec v2 §3).
-- Additive + idempotent — safe to run on the live DB.

-- Notifications
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  type        text not null,
  project_id  uuid references projects(id) on delete cascade,
  message     text,
  is_read     boolean default false,
  created_at  timestamptz default now()
);
create index if not exists idx_notifications_user on notifications(user_id, is_read);

-- Audit log
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid,
  user_id     uuid references users(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz default now()
);
create index if not exists idx_audit_log_created on audit_log(created_at desc);

-- Webhook subscriptions
create table if not exists webhook_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete cascade,
  event_types  text[] default '{}',
  url          text not null,
  secret       text not null,
  is_active     boolean default true,
  last_triggered_at timestamptz,
  failure_count integer default 0,
  created_at   timestamptz default now()
);
create index if not exists idx_webhooks_user on webhook_subscriptions(user_id);

-- Report versioning
alter table reports add column if not exists version integer default 1;
