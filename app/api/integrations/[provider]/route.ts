// POST /api/integrations/[provider] — export/import to a Phase 3 integration.
// Mock-aware: reports whether the integration is configured (env key present). When configured
// it returns a (simulated) artifact reference; real API calls are wired per provider later.
import { NextResponse } from "next/server";
import { getProject } from "@/lib/db";
import { hasMural, hasFigma, hasJira, hasConfluence } from "@/lib/config";
import { readJson, badRequest } from "@/lib/http";

export const runtime = "nodejs";

const PROVIDERS = {
  mural: { label: "Mural", configured: () => hasMural, env: "MURAL_API_KEY", verb: "Exported board to" },
  jira: { label: "Jira", configured: () => hasJira, env: "JIRA_BASE_URL + JIRA_API_TOKEN", verb: "Created issues in" },
  confluence: { label: "Confluence", configured: () => hasConfluence, env: "CONFLUENCE_API_TOKEN", verb: "Published page to" },
  figma: { label: "Figma", configured: () => hasFigma, env: "FIGMA_ACCESS_TOKEN", verb: "Imported screens from" },
} as const;

type Provider = keyof typeof PROVIDERS;

export async function POST(req: Request, { params }: { params: { provider: string } }) {
  const provider = params.provider as Provider;
  const cfg = PROVIDERS[provider];
  if (!cfg) return NextResponse.json({ error: "Unknown integration" }, { status: 404 });

  const body = await readJson<{ projectId?: string }>(req);
  if (!body?.projectId || !(await getProject(body.projectId))) return badRequest("Unknown project");

  if (!cfg.configured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: `${cfg.label} is not connected. An admin can set ${cfg.env} to enable it.`,
    });
  }

  // Configured: real provider calls wired later. Acknowledge the action for now.
  return NextResponse.json({
    ok: true,
    configured: true,
    message: `${cfg.verb} ${cfg.label} (simulated — live API call wired in a follow-up).`,
  });
}
