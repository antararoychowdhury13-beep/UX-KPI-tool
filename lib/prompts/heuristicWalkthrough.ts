// Prompt 3a — Heuristic Walkthrough (Claude). Spec v2 §6. Testing method: heuristic.

export function heuristicWalkthroughPrompt(params: {
  personaJson: string;
  flowType: "before" | "after";
  flowDescription: string;
  keyChanges: string;
}): string {
  return `You are a UX usability expert applying Nielsen's 10 Heuristics.
Evaluate how this persona would experience this UI flow.
Persona: ${params.personaJson}
Flow variant: ${params.flowType} (before | after)
Flow description: ${params.flowDescription}
Key UI changes: ${params.keyChanges}

Score each of Nielsen's 10 heuristics 0-10 for this flow. Identify friction points per screen with severity.
Return JSON only:
{
  "task_success_rate": float (0-1),
  "estimated_time_to_task": "...",
  "error_likelihood": "low|medium|high",
  "overall_score": float (0-10),
  "heuristic_scores": {
    "visibility_of_system_status": number,
    "match_real_world": number,
    "user_control_freedom": number,
    "consistency_standards": number,
    "error_prevention": number,
    "recognition_over_recall": number,
    "flexibility_efficiency": number,
    "aesthetic_minimalist": number,
    "error_recovery": number,
    "help_documentation": number
  },
  "friction_points": [
    { "screen_sequence": number, "description": "...", "severity": "low|medium|high", "heuristic_violated": "...", "reason": "..." }
  ],
  "confidence_level": float,
  "persona_reaction": "..."
}`;
}
