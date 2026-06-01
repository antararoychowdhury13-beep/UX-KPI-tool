// Prompt 3 — Synthetic Usability Testing (Claude). Spec §5.

export function syntheticTestingPrompt(params: {
  personaJson: string;
  flowType: "before" | "after";
  flowDescription: string;
  keyChanges: string;
}): string {
  return `You are a usability testing expert. Simulate how this persona would interact with this UI flow.
Persona: ${params.personaJson}
Flow type: ${params.flowType} (before | after)
Flow description: ${params.flowDescription}
Key UI changes: ${params.keyChanges}

Return JSON only:
{
  "task_success_rate": float (0-1),
  "estimated_time_to_task": "...",
  "friction_points": [
    {
      "screen_sequence": number,
      "description": "...",
      "severity": "low|medium|high",
      "reason": "..."
    }
  ],
  "error_likelihood": "low|medium|high",
  "confidence_level": float,
  "persona_reaction": "...",
  "overall_score": float (0-10)
}`;
}
