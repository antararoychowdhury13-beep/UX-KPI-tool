// Prompt 3c — Think-Aloud Simulation (Claude). Spec v2 §6. Testing method: think_aloud.

export function thinkAloudSimulationPrompt(params: {
  personaJson: string;
  flowType: "before" | "after";
  flowDescription: string;
  keyChanges: string;
}): string {
  return `You are a UX researcher simulating a think-aloud usability session.
Generate a realistic think-aloud verbal transcript of this persona navigating this UI flow.
Write in first-person as if the persona is narrating their thoughts screen by screen.
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
  "think_aloud_transcript": "Full multi-paragraph first-person transcript...",
  "key_quotes": ["Quote revealing a pain point...", "Quote showing delight..."],
  "emotional_arc": "frustrated_start_to_confident_end|confused_throughout|smooth_experience",
  "friction_points": [
    { "screen_sequence": number, "description": "...", "severity": "low|medium|high", "reason": "..." }
  ],
  "confidence_level": float,
  "persona_reaction": "..."
}`;
}
