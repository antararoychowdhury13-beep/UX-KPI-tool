-- v3 testing engine (spec v3 §6). Additive + idempotent — safe on the live DB.

-- Per-project model assignments (which model runs each evaluation step).
create table if not exists ai_model_assignments (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid references projects(id) on delete cascade unique,
  step_vision      text not null default 'gemini-1.5-flash',
  step_eval        text not null default 'claude-sonnet-4',
  step_score       text not null default 'claude-haiku-4',
  step_kpi         text not null default 'claude-sonnet-4',
  method_overrides jsonb default '{}',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- User-defined evaluation criteria.
create table if not exists custom_tests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid,
  user_id      uuid references users(id) on delete cascade,
  project_id   uuid references projects(id) on delete cascade,
  name         text not null,
  description  text not null,
  ai_model     text not null default 'claude-sonnet-4',
  scope        text default 'all_personas',
  is_template  boolean default false,
  created_at   timestamptz default now()
);
create index if not exists idx_custom_tests_project on custom_tests(project_id);

-- Test run configuration + summary (a snapshot of how a run was configured).
create table if not exists test_runs (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid references projects(id) on delete cascade,
  flow_mode         text not null default 'before_after',
  methods_selected  text[] not null default '{}',
  custom_test_ids   uuid[],
  persona_ids       uuid[],
  model_assignments jsonb,
  status            text not null default 'queued',
  ux_score_before   real,
  ux_score_after    real,
  ux_delta          real,
  total_ai_calls    integer,
  completed_at      timestamptz,
  created_at        timestamptz default now()
);
create index if not exists idx_test_runs_project on test_runs(project_id);
