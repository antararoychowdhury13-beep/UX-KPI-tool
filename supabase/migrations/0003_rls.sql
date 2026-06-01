-- Row-Level Security. The app's server data layer uses the service-role key (which BYPASSES RLS),
-- so enabling these policies does not change app behavior — they are defense-in-depth for any
-- direct anon/session-key access. Apply in the Supabase SQL editor.

alter table users                  enable row level security;
alter table projects               enable row level security;
alter table screenshots            enable row level security;
alter table personas               enable row level security;
alter table analyses               enable row level security;
alter table kpi_matrices           enable row level security;
alter table synthetic_test_results enable row level security;
alter table reports                enable row level security;
alter table api_usage_log          enable row level security;

-- users: a user can read/update their own row.
create policy "own user" on users for select using (auth.uid() = id);
create policy "update own user" on users for update using (auth.uid() = id);

-- projects: full access to your own projects.
create policy "own projects" on projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- personas: your own personas, plus global templates are readable by everyone.
create policy "own or template personas" on personas for select using (auth.uid() = user_id or is_template);
create policy "write own personas" on personas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- child rows: accessible when the parent project belongs to the user.
create policy "screenshots via project" on screenshots for all
  using (exists (select 1 from projects p where p.id = screenshots.project_id and p.user_id = auth.uid()));
create policy "analyses via project" on analyses for all
  using (exists (select 1 from projects p where p.id = analyses.project_id and p.user_id = auth.uid()));
create policy "kpi via project" on kpi_matrices for all
  using (exists (select 1 from projects p where p.id = kpi_matrices.project_id and p.user_id = auth.uid()));
create policy "tests via project" on synthetic_test_results for all
  using (exists (select 1 from projects p where p.id = synthetic_test_results.project_id and p.user_id = auth.uid()));
create policy "reports via project" on reports for all
  using (exists (select 1 from projects p where p.id = reports.project_id and p.user_id = auth.uid()));

-- api usage: your own log entries.
create policy "own usage" on api_usage_log for select using (auth.uid() = user_id);
