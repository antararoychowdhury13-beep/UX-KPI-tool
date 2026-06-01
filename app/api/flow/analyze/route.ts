// POST /api/flow/analyze — analyse a project's flow description and return a structured context
// summary (spec v2 §6, Prompt 0). The persona builder uses the result to pre-configure generation.
import { NextResponse } from "next/server";
import { logApiUsage } from "@/lib/db";
import { analyzeFlowContext } from "@/lib/ai/claude";
import { resolveTextProvider } from "@/lib/ai/providers";
import { getCurrentUserIdOrNull, getOwnedProject } from "@/lib/auth";
import { checkRateLimit } from "@/lib/utils/rateLimiter";
import { readJson, badRequest, unauthorized } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();

  const body = await readJson<{ projectId?: string; industry?: string }>(req);
  if (!body) return badRequest("Invalid JSON body");
  const project = body.projectId ? await getOwnedProject(body.projectId, userId) : null;
  if (!project) return NextResponse.json({ error: "Unknown project" }, { status: 404 });

  if (!(await checkRateLimit(userId))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const context = await analyzeFlowContext({
    flowDescription: project.description ?? "",
    flowType: project.flow_type ?? "custom",
    industry: body.industry ?? "Enterprise Software",
  });

  await logApiUsage({
    user_id: userId,
    service: resolveTextProvider()?.slug ?? "claude",
    endpoint: "/api/flow/analyze",
    status: "success",
  });
  return NextResponse.json({ context });
}
