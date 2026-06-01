-- ============================================================================
-- UX KPI Intelligence Tool — initial schema (spec §3)
-- Apply via Supabase SQL editor, the Supabase CLI, or the Supabase MCP.
-- NOTE: pgvector must be permitted on your project. Enable it before applying.
-- ============================================================================

create extension if not exists "vector";
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ── Enum types ──────────────────────────────────────────────────────────────
create type user_role        as enum ('user', 'admin');
create type project_status   as enum ('draft', 'processing', 'completed', 'failed');
create type screenshot_type  as enum ('before', 'after');
create type tech_comfort     as enum ('low', 'medium', 'high');
create type analysis_status  as enum ('queued', 'processing', 'completed', 'failed');
create type error_likelihood as enum ('low', 'medium', 'high');
create type api_service      as enum ('claude', 'gemini', 'huggingface');
create type api_status       as enum ('success', 'failed', 'rate_limited');

-- ── users ────────────────────────────────────────────────────────────────────
create table users (
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,
  full_name       text,
  role            user_role not null default 'user',
  quota_analyses  integer not null default 10,
  quota_used      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── projects ──────────────────────────────────────────────────────────────────
create table projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users (id) on delete cascade,
  name         text not null,
  description  text,
  flow_type    text,                       -- 'onboarding' | 'checkout' | 'settings' | 'dashboard' | ...
  status       project_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_projects_user_id on projects (user_id);

-- ── screenshots ───────────────────────────────────────────────────────────────
create table screenshots (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects (id) on delete cascade,
  type            screenshot_type not null,
  sequence_order  integer not null,
  file_name       text not null,
  file_path       text not null,           -- Supabase storage path
  screen_label    text,                    -- parsed from file name
  uploaded_at     timestamptz not null default now()
);
create index idx_screenshots_project_id on screenshots (project_id);

-- ── personas ──────────────────────────────────────────────────────────────────
create table personas (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users (id) on delete cascade,
  project_id         uuid references projects (id) on delete cascade, -- null = saved library persona
  name               text not null,
  age_range          text,
  gender             text,
  occupation         text,
  tech_comfort       tech_comfort not null default 'medium',
  behavioral_traits  jsonb not null default '[]'::jsonb,              -- array of trait strings
  goals              text,
  frustrations       text,
  is_template        boolean not null default false,                 -- admin-created global templates
  is_synthetic       boolean not null default true,
  generated_by_ai    boolean not null default true,
  created_at         timestamptz not null default now()
);
create index idx_personas_user_id    on personas (user_id);
create index idx_personas_project_id on personas (project_id);

-- ── analyses ──────────────────────────────────────────────────────────────────
create table analyses (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references projects (id) on delete cascade,
  status               analysis_status not null default 'queued',
  before_summary       text,
  after_summary        text,
  flow_diff            jsonb,              -- structured diff of workflow changes
  raw_gemini_response  jsonb,
  raw_claude_response  jsonb,
  processing_time_ms   integer,
  created_at           timestamptz not null default now()
);
create index idx_analyses_project_id on analyses (project_id);

-- ── kpi_matrices ──────────────────────────────────────────────────────────────
create table kpi_matrices (
  id                  uuid primary key default gen_random_uuid(),
  analysis_id         uuid not null references analyses (id) on delete cascade,
  project_id          uuid not null references projects (id) on delete cascade,
  kpis                jsonb not null default '[]'::jsonb, -- array of KPI objects
  overall_confidence  real,
  generated_at        timestamptz not null default now()
);
create index idx_kpi_matrices_analysis_id on kpi_matrices (analysis_id);
create index idx_kpi_matrices_project_id  on kpi_matrices (project_id);

-- ── synthetic_test_results ──────────────────────────────────────────────────────
create table synthetic_test_results (
  id                     uuid primary key default gen_random_uuid(),
  project_id             uuid not null references projects (id) on delete cascade,
  persona_id             uuid not null references personas (id) on delete cascade,
  flow_type              screenshot_type not null,   -- 'before' | 'after'
  task_success_rate      real,
  friction_points        jsonb not null default '[]'::jsonb,
  time_to_task_estimate  text,
  error_likelihood       error_likelihood,
  overall_score          real,
  raw_ai_response        jsonb,
  tested_at              timestamptz not null default now()
);
create index idx_str_project_id on synthetic_test_results (project_id);
create index idx_str_persona_id on synthetic_test_results (persona_id);

-- ── reports ───────────────────────────────────────────────────────────────────
create table reports (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects (id) on delete cascade,
  kpi_matrix_id  uuid not null references kpi_matrices (id) on delete cascade,
  annotations    jsonb not null default '{}'::jsonb, -- Konva.js annotation data per screenshot
  pdf_path       text,                                -- Supabase storage path
  share_token    text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_at     timestamptz not null default now()
);
create index idx_reports_project_id on reports (project_id);

-- ── api_usage_log ───────────────────────────────────────────────────────────────
create table api_usage_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references users (id) on delete set null,
  service        api_service not null,
  endpoint       text,
  tokens_used    integer not null default 0,
  cost_estimate  real not null default 0,
  status         api_status not null,
  called_at      timestamptz not null default now()
);
create index idx_api_usage_log_user_id on api_usage_log (user_id);
create index idx_api_usage_log_service on api_usage_log (service);
