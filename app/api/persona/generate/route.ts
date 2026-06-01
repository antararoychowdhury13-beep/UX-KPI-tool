// POST /api/persona/generate — generate synthetic personas via Claude and attach them to a project.
import { NextResponse } from "next/server";
import { addPersonas, logApiUsage, recordAudit } from "@/lib/db";
import { generatePersonas } from "@/lib/ai/claude";
import { resolveTextProvider } from "@/lib/ai/providers";
import { getCurrentUserIdOrNull, getOwnedProject } from "@/lib/auth";
import { checkRateLimit } from "@/lib/utils/rateLimiter";
import { readJson, badRequest, unauthorized } from "@/lib/http";
import type { GeneratedPersona, Persona, TechComfort } from "@/types/persona";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await readJson<{
    projectId?: string;
    count?: number;
    productType?: string;
    industry?: string;
    demographics?: string;
    genders?: string;
    roleLevels?: string;
    accessibility?: string;
    traits?: string;
    techComfort?: string;
  }>(req);
  if (!body) return badRequest("Invalid JSON body");

  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();

  const project = body.projectId ? await getOwnedProject(body.projectId, userId) : null;
  if (!project) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  if (!(await checkRateLimit(userId))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const count = Math.max(1, Math.min(body.count ?? 3, 10));
  const industry = body.industry ?? body.productType ?? "Enterprise Software";
  const generated = await generatePersonas({
    count,
    flowDescription: project.description ?? "",
    productType: body.productType ?? "Enterprise Software",
    industry,
    ageRanges: body.demographics ?? "",
    genders: body.genders,
    roleLevels: body.roleLevels,
    accessibility: body.accessibility,
    traits: body.traits ?? "",
    techComfort: body.techComfort ?? "low to high",
  });

  const normTech = (g: GeneratedPersona): TechComfort => {
    if (g.tech_comfort === "low" || g.tech_comfort === "medium" || g.tech_comfort === "high") return g.tech_comfort;
    const s = g.tech_comfort_score ?? 5;
    return s <= 3 ? "low" : s <= 6 ? "medium" : "high";
  };

  const rows: Array<Omit<Persona, "id" | "created_at">> = generated.map((g) => ({
    user_id: userId,
    project_id: body.projectId!,
    name: g.name,
    age: typeof g.age === "number" ? g.age : null,
    age_range: g.age_range ?? (typeof g.age === "number" ? String(g.age) : null),
    gender: g.gender,
    occupation: g.occupation,
    occupation_detail: g.occupation_detail ?? null,
    role_level: g.role_level ?? null,
    location: g.location ?? null,
    tech_comfort: normTech(g),
    tech_comfort_score: typeof g.tech_comfort_score === "number" ? g.tech_comfort_score : null,
    behavioral_traits: g.behavioral_traits,
    goals: g.primary_goal,
    frustrations: g.key_frustration,
    motivation_quote: g.motivation_quote ?? null,
    accessibility_profile: g.accessibility_profile ?? g.accessibility_needs ?? null,
    experience_years: g.experience_years,
    device_preference: g.device_preference,
    is_template: false,
    is_synthetic: true,
    generated_by_ai: true,
  }));

  const personas = await addPersonas(rows);
  await logApiUsage({ user_id: userId, service: resolveTextProvider()?.slug ?? "claude", endpoint: "/api/persona/generate", status: "success" });
  await recordAudit({ user_id: userId, action: "persona.generated", entity_type: "project", entity_id: project.id, metadata: { count: personas.length } });
  return NextResponse.json({ personas }, { status: 201 });
}
