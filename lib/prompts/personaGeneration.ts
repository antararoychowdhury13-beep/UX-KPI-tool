// Prompt 2 — Persona Generation (Claude). Spec §5.

export function personaGenerationPrompt(params: {
  count: number;
  flowDescription: string;
  productType: string;
  demographics: string;
  traits: string;
  techComfort: string;
}): string {
  return `You are a UX research expert specializing in enterprise software users.
Generate ${params.count} distinct synthetic user personas for testing this UI flow.
Flow context: ${params.flowDescription}
Product type: ${params.productType}
Demographic constraints: ${params.demographics}
Behavioral traits to include: ${params.traits}
Tech comfort range: ${params.techComfort}

Return JSON only — an array of persona objects:
[{
  "name": "...",
  "age": number,
  "gender": "...",
  "occupation": "...",
  "experience_years": number,
  "tech_comfort": "low|medium|high",
  "behavioral_traits": ["..."],
  "primary_goal": "...",
  "key_frustration": "...",
  "mental_model": "...",
  "accessibility_needs": "...",
  "device_preference": "..."
}]`;
}
