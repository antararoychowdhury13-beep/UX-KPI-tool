-- v2 AI-depth columns (spec v2 §3). Additive + idempotent — safe to run on the live DB.
-- Personas: richer demographics shown on the v2 persona cards.
-- (experience_years/device_preference were defined in 0002; included here so one migration
--  brings the personas table fully up to date even if 0002 was never applied.)
alter table personas add column if not exists experience_years integer;
alter table personas add column if not exists device_preference text;
alter table personas add column if not exists age integer;
alter table personas add column if not exists age_range text;
alter table personas add column if not exists role_level text;
alter table personas add column if not exists occupation_detail text;
alter table personas add column if not exists location text;
alter table personas add column if not exists motivation_quote text;
alter table personas add column if not exists accessibility_profile text;
alter table personas add column if not exists tech_comfort_score integer;

-- KPI matrices: composite UX score (0-100) for before/after flows.
alter table kpi_matrices add column if not exists ux_score_before real;
alter table kpi_matrices add column if not exists ux_score_after real;
alter table kpi_matrices add column if not exists ux_score_delta real;

-- Projects: persist the UX score so dashboard cards can show it without re-reading the matrix.
alter table projects add column if not exists ux_score_before real;
alter table projects add column if not exists ux_score_after real;
alter table projects add column if not exists ux_score_delta real;
