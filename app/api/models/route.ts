// GET /api/models — list all 20 AI models with capabilities + per-provider availability (spec v3).
import { NextResponse } from "next/server";
import { ALL_MODELS, isModelAvailable } from "@/lib/models/registry";
import { getCurrentUserIdOrNull } from "@/lib/auth";
import { unauthorized } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  return NextResponse.json({
    models: ALL_MODELS.map((m) => ({ ...m, envVar: undefined, available: isModelAvailable(m.id) })),
  });
}
