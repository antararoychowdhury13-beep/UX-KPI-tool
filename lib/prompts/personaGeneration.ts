// Prompt 2 — Persona Generation (Claude). Spec v2 §6.

export function personaGenerationPrompt(params: {
  count: number;
  flowDescription: string;
  productType: string;
  industry?: string;
  flowContext?: string;
  ageRanges: string;
  genders?: string;
  roleLevels?: string;
  techComfort: string;
  accessibility?: string;
  traits: string;
}): string {
  return `You are a UX research expert specializing in enterprise software user archetypes.
Generate ${params.count} distinct synthetic user personas for testing this UI redesign.

${params.flowContext ? `Flow context analysis: ${params.flowContext}\n` : ""}Flow description: ${params.flowDescription}
Product / industry: ${params.industry ?? params.productType}
Age ranges: ${params.ageRanges}
Genders: ${params.genders ?? "mixed"}
Role levels: ${params.roleLevels ?? "mixed"}
Tech comfort: ${params.techComfort}
Accessibility profiles: ${params.accessibility ?? "none"}
Behavioral traits to include: ${params.traits}

Rules:
- Each persona must be demographically distinct.
- Location must reflect realistic enterprise user geography for the industry (e.g. "Bangalore, India").
- motivation_quote must be a first-person quote reflecting their primary workflow pain point.
- tech_comfort_score must be a number 1-10; tech_comfort must be one of low|medium|high.
- Behavioral traits should draw from the provided list.

Return JSON only — an array of persona objects:
[{
  "name": "...",
  "age": number,
  "age_range": "36-45",
  "gender": "male|female|non_binary",
  "occupation": "...",
  "occupation_detail": "more specific role description",
  "role_level": "junior|mid|senior|lead|manager|director",
  "location": "City, Country",
  "experience_years": number,
  "tech_comfort": "low|medium|high",
  "tech_comfort_score": number,
  "device_preference": "desktop|laptop|mobile|multi_monitor",
  "behavioral_traits": ["..."],
  "accessibility_profile": "none|visual_impairment|motor_difficulty|cognitive_load",
  "primary_goal": "...",
  "key_frustration": "...",
  "motivation_quote": "First-person quote expressing their core need...",
  "mental_model": "..."
}]`;
}
