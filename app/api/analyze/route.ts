// POST /api/analyze — queue (or inline-run) screenshot analysis for a project. Returns a job id.
import { NextResponse } from "next/server";
import { getProject, listScreenshots, hasQuota, incrementQuotaUsed, logApiUsage } from "@/lib/db";
import { enqueueAnalysis } from "@/lib/queue/analysisQueue";
import { getCurrentUserId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/utils/rateLimiter";
import { readJson, badRequest } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await readJson<{ projectId?: string }>(req);
  if (!body) return badRequest("Invalid JSON body");
  const { projectId } = body;
  if (!projectId || !(await getProject(projectId))) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  const userId = getCurrentUserId();
  if (!(await checkRateLimit(userId))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  if (!(await hasQuota(userId))) {
    return NextResponse.json(
      { error: "Analysis quota exhausted. Ask an admin to raise your quota." },
      { status: 402 },
    );
  }

  const screenshots = await listScreenshots(projectId);
  const hasBefore = screenshots.some((s) => s.type === "before");
  const hasAfter = screenshots.some((s) => s.type === "after");
  if (!hasBefore || !hasAfter) {
    return NextResponse.json(
      { error: "At least one before and one after screenshot are required" },
      { status: 400 },
    );
  }

  const jobId = await enqueueAnalysis(projectId);
  await incrementQuotaUsed(userId);
  await logApiUsage({ user_id: userId, service: "gemini", endpoint: "/api/analyze", status: "success" });
  return NextResponse.json({ jobId }, { status: 202 });
}
