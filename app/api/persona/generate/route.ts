// POST /api/persona/generate — generate synthetic personas via Claude and attach them to a project.
import { NextResponse } from "next/server";
import { getProject, addPersonas, logApiUsage } from "@/lib/db";
import { generatePersonas } from "@/lib/ai/claude";
import { resolveTextProvider } from "@/lib/ai/providers";
import { getCurrentUserId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/utils/rateLimiter";
import { readJson, badRequest } from "@/lib/http";
import type { Persona, TechComfort } from "@/types/persona";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await readJson<{
    projectId?: string;
    count?: number;
    productType?: string;
    demographics?: string;
    traits?: string;
    techComfort?: string;
  }>(req);
  if (!body) return badRequest("Invalid JSON body");

  const project = body.projectId ? await getProject(body.projectId) : undefined;
  if (!project) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  const userId = await getCurrentUserId();
  if (!(await checkRateLimit(userId))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const count = Math.max(1, Math.min(body.count ?? 3, 10));
  const generated = await generatePersonas({
    count,
    flowDescription: project.description ?? "",
    productType: body.productType ?? "Enterprise Software",
    demographics: body.demographics ?? "",
    traits: body.traits ?? "",
    techComfort: body.techComfort ?? "low to high",
  });

  const rows: Array<Omit<Persona, "id" | "created_at">> = generated.map((g) => ({
    user_id: userId,
    project_id: body.projectId!,
    name: g.name,
    age_range: String(g.age),
    gender: g.gender,
    occupation: g.occupation,
    tech_comfort: g.tech_comfort as TechComfort,
    behavioral_traits: g.behavioral_traits,
    goals: g.primary_goal,
    frustrations: g.key_frustration,
    experience_years: g.experience_years,
    device_preference: g.device_preference,
    is_template: false,
    is_synthetic: true,
    generated_by_ai: true,
  }));

  const personas = await addPersonas(rows);
  await logApiUsage({ user_id: userId, service: resolveTextProvider()?.slug ?? "claude", endpoint: "/api/persona/generate", status: "success" });
  return NextResponse.json({ personas }, { status: 201 });
}
