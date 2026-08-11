# UX KPI Intelligence Tool

Generate a validated KPI matrix from before/after UI redesign screenshots. The tool analyzes
visual and workflow differences with AI, generates synthetic personas, runs simulated usability
testing, and produces a visual report with KPI predictions and confidence scores — no real user
research data required.

> **Status:** Milestone 4 + measured engine (v4). Synthetic testing now runs on the **SynthUX
> measured engine** (`lib/synthux`): every persona expands into a panel of simulated participants,
> and every reported number — task success, confidence intervals, friction severity — is *measured*
> from those sessions rather than estimated by a single model prompt. Results are deterministic per
> persona/flow, so before/after deltas are attributable to the design change. The full flow works
> end-to-end locally with
> **zero keys**: create project → upload screenshots → analyze → generate personas → synthetic
> testing → KPI matrix → shareable report. Each external service (Supabase, Redis, Claude, Gemini,
> HuggingFace) runs live when its env vars are present and falls back to an in-memory/canned mock
> otherwise — see Settings → Connected services for live/mock status.

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts, Konva.js,
  React Dropzone, React Hook Form, Zustand
- **Backend:** Next.js Route Handlers, BullMQ + Redis (Upstash), Sharp
- **AI:** Claude (`@anthropic-ai/sdk`), Google Gemini, HuggingFace (fallback)
- **Data/Auth/Storage:** Supabase (PostgreSQL + pgvector, Auth, Storage)
- **Hosting:** Vercel (app/API), Supabase, Upstash; BullMQ worker as a separate process

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local   # then fill in real values

# 3. Apply the database schema
#    Supabase SQL editor / CLI / MCP — see supabase/migrations/0001_initial_schema.sql
#    (Enable the pgvector extension on your project first.)

# 4. Run the app
npm run dev                  # http://localhost:3000  (works with no keys — mock mode)

# 5. (Optional) background worker — only does work when Redis is configured
npm run worker

# 6. (Optional) end-to-end pipeline smoke test in mock mode
npm run smoke
```

> **Mock-mode caveat:** the in-memory datastore lives in the dev server process — data resets on
> restart and is single-process only. Configure Supabase for persistence. Analysis runs inline
> (no queue) until Upstash Redis is configured.

## Project layout

```
app/            Routes (App Router): (auth), (dashboard), admin, api
components/     UI by domain: upload, persona, analysis, kpi, report, ui
lib/            ai/ supabase/ queue/ prompts/ utils/ + store.ts (Zustand)
types/          Domain types mirroring the DB schema
supabase/       SQL migrations
middleware.ts   Route protection scaffold
```

Empty directories contain `.gitkeep` placeholders and will be filled out in later milestones.

## Roadmap

Milestone breakdown:

- **M0 Foundation** — tooling, types, DB schema, env template ✅
- **M1 Core MVP** — project flow, upload, analysis pipeline, personas, synthetic testing, KPI matrix, report ✅
- **M2 Testing + visualization** — Recharts KPI charts, Konva annotated screens, Puppeteer PDF export ✅
- **M3 Collaboration + integrations** — shareable no-login report links ✅; Mural/Figma/Jira/Confluence action buttons scaffolded (need provider credentials to go live)
- **M4 Scale** — quota enforcement ✅, admin panel (users/quota, AI-service CRUD, usage log) ✅; team accounts / billing / marketplace not yet built

Everything currently runs **mock-first** — add the env vars in `.env.example` to switch each
service to live.

## Deploying to Cloudflare (auto-deploy)

`.github/workflows/deploy.yml` deploys on every push to `main` once two repository secrets exist
(Settings → Secrets and variables → Actions): `CLOUDFLARE_API_TOKEN` (dashboard → My Profile →
API Tokens → "Edit Cloudflare Workers" template) and `CLOUDFLARE_ACCOUNT_ID` (dashboard →
Workers & Pages → right sidebar). Without the secrets the job skips cleanly. Manual deploys:
see `CLOUDFLARE.md`. The app goes live at `https://ux-kpi-tool.<your-subdomain>.workers.dev`.

## Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` on the frontend — server only.
- All AI calls go through `lib/ai/` wrappers; all prompts live in `lib/prompts/`.
- AI-heavy operations are queued (BullMQ), never run synchronously in HTTP handlers.
- Screenshot files → Supabase Storage bucket `project-screenshots`; PDFs → bucket `reports`.
- Filename convention: `{sequence}-{label}.{ext}` (e.g. `01-login-screen.png`),
  sequence parsed via `/^(\d+)[-_]/`.
