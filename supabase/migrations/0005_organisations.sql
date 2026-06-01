-- v2 multi-tenancy (spec v2 §3). Additive + idempotent — safe on the live DB.
create table if not exists organisations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique,
  plan        text not null default 'free',
  quota_analyses_per_month integer default 10,
  quota_users_max integer default 5,
  created_at  timestamptz default now()
);

alter table users    add column if not exists org_id uuid references organisations(id) on delete set null;
alter table personas add column if not exists org_id uuid references organisations(id) on delete set null;
alter table projects add column if not exists org_id uuid references organisations(id) on delete set null;

create index if not exists idx_users_org_id ON users(org_id);
create index if not exists idx_personas_org_id ON personas(org_id);
create index if not exists idx_projects_org_id ON projects(org_id);
