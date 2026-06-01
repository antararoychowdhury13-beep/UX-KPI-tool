# Deploying to Cloudflare Workers (OpenNext)

This app is configured to deploy to **Cloudflare Workers** via the
[OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare). Persistence is Supabase, so a
Worker (stateless) deployment works fine.

## One-time setup
1. Install the base deps: `npm install`
2. Install the Cloudflare adapter + Wrangler (kept out of base deps so the core install stays light
   and Next-14-compatible — `1.15.x` is the last OpenNext that supports Next 14.2):
   ```bash
   npm install -D @opennextjs/cloudflare@~1.15.0 wrangler@^4
   ```
3. Authenticate Wrangler with your Cloudflare account (interactive — opens a browser):
   ```bash
   npx wrangler login
   ```

## Set server secrets
`NEXT_PUBLIC_*` vars are inlined at build time (from `.env` / `.env.local`). The **server secrets**
must be set on the Worker:
```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put GOOGLE_GEMINI_API_KEY
# optional:
npx wrangler secret put QWEN_API_KEY
```
Also set the public build vars before building (or put them in `.env.local`, which the build reads):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` (your Workers URL).

For local Worker preview, copy `.dev.vars.example` → `.dev.vars` and fill the secrets.

## Preview locally on the Workers runtime
```bash
npm run preview:cf
```

## Deploy
```bash
npm run deploy:cf
```
This runs the OpenNext build and `wrangler deploy`. Your app goes live at
`https://ux-kpi-tool.<your-subdomain>.workers.dev` (or a custom domain you bind in the dashboard).

## What changes on Workers (edge runtime)
The app degrades gracefully where the Node-only pieces can't run:
- **PDF export** (Puppeteer/Chromium) can't run on Workers → the export endpoint returns `501` and the
  client falls back to the **browser print dialog**. (For server-side PDF on Workers, integrate
  Cloudflare Browser Rendering separately.)
- **Analysis runs synchronously** inside the request (no BullMQ/Redis worker on Workers) — the
  inline path is awaited, so results are ready when the request returns.
- **AI-service admin config** is in-memory, so toggles/added services don't persist across Worker
  isolates (they reset to defaults). Move that to a DB table if you need it to stick.
- `ioredis`/`bullmq`/`sharp` are not used on Workers.

Everything else — projects, screenshots (Supabase Storage), personas, synthetic tests, KPI
matrices, reports, auth — runs fully on Workers against Supabase.

## Alternative: a Node host (no edge constraints)
If you'd rather keep Puppeteer PDF + the BullMQ worker, deploy to a Node platform (Railway/Render/Fly)
with `npm run build` + `npm start` and run `npm run worker` as a background process. You can still
point a Cloudflare-managed domain at it via DNS.
