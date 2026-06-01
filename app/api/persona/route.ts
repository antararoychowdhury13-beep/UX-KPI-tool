// GET  /api/persona — the current user's library personas (+ global templates).
// POST /api/persona — manually create a persona directly in the library (project_id = null).
import { NextResponse } from "next/server";
import { addPersonas, listPersonas, recordAudit } from "@/lib/db";
import { getCurrentUserIdOrNull } from "@/lib/auth";
import { readJson, badRequest, unauthorized } from "@/lib/http";
import type { TechComfort } from "@/types/persona";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const personas = (await listPersonas(userId)).filter((p) => p.project_id === null);
  return NextResponse.json({ personas });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const body = await readJson<{
    name?: string;
    occupation?: string;
    role_level?: string;
    tech_comfort?: string;
    location?: string;
    age?: number;
    gender?: string;
    traits?: string[];
    goals?: string;
    frustrations?: string;
    motivation_quote?: string;
  }>(req);
  if (!body?.name?.trim()) return badRequest("A persona name is required");

  const tc: TechComfort = body.tech_comfort === "low" || body.tech_comfort === "high" ? body.tech_comfort : "medium";
  const [persona] = await addPersonas([
    {
      user_id: userId,
      project_id: null,
      name: body.name.trim(),
      age: typeof body.age === "number" ? body.age : null,
      age_range: null,
      gender: body.gender ?? null,
      occupation: body.occupation ?? null,
      occupation_detail: null,
      role_level: body.role_level ?? null,
      location: body.location ?? null,
      tech_comfort: tc,
      tech_comfort_score: tc === "high" ? 9 : tc === "low" ? 3 : 6,
      behavioral_traits: (body.traits ?? []).filter(Boolean),
      goals: body.goals ?? null,
      frustrations: body.frustrations ?? null,
      motivation_quote: body.motivation_quote ?? null,
      accessibility_profile: null,
      is_template: false,
      is_synthetic: false,
      generated_by_ai: false,
    },
  ]);
  await recordAudit({ user_id: userId, action: "persona.created", entity_type: "persona", entity_id: persona.id });
  return NextResponse.json({ persona }, { status: 201 });
}
