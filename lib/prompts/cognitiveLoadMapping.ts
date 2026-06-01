// Prompt 3d — Cognitive Load Mapping (Claude). Spec v2 §6. Testing method: cognitive_load.

export function cognitiveLoadMappingPrompt(params: {
  personaJson: string;
  flowType: "before" | "after";
  flowDescription: string;
  keyChanges: string;
}): string {
  return `You are a cognitive psychology and UX specialist.
Map the cognitive load experienced by this persona at each screen in this flow.
Score cognitive load 0-10 where 10 = overwhelming mental effort required.
Persona: ${params.personaJson}
Flow variant: ${params.flowType} (before | after)
Flow description: ${params.flowDescription}
Key UI changes: ${params.keyChanges}

Return JSON only:
{
  "task_success_rate": float (0-1),
  "estimated_time_to_task": "...",
  "overall_score": float (0-10),
  "error_likelihood": "low|medium|high",
  "average_cognitive_load": float,
  "peak_load_screen": number,
  "cognitive_load_map": [
    {
      "screen_sequence": number,
      "screen_label": "...",
      "load_score": number (0-10),
      "peak_areas": ["..."],
      "load_type": "intrinsic|extraneous|germane",
      "reason": "...",
      "reduction_opportunity": "..."
    }
  ],
  "friction_points": [
    { "screen_sequence": number, "description": "...", "severity": "low|medium|high", "reason": "..." }
  ],
  "confidence_level": float,
  "persona_reaction": "..."
}`;
}
