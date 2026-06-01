// Generic synthetic-testing prompt for methods beyond the four bespoke ones (spec v2 §6).
// Parameterised by the method's title + focus; returns universal scoring fields + findings.

export function genericMethodPrompt(params: {
  personaJson: string;
  flowType: "before" | "after";
  flowDescription: string;
  keyChanges: string;
  methodTitle: string;
  focus: string;
}): string {
  return `You are a senior UX evaluator running a "${params.methodTitle}" evaluation.
Evaluate this UI flow specifically for: ${params.focus}.

Persona: ${params.personaJson}
Flow variant: ${params.flowType} (before | after)
Flow description: ${params.flowDescription}
Key UI changes: ${params.keyChanges}

Judge the flow through the lens above for this persona. Return JSON only:
{
  "task_success_rate": float (0-1),
  "estimated_time_to_task": "...",
  "error_likelihood": "low|medium|high",
  "overall_score": float (0-10, how well the flow performs for this lens),
  "findings": [
    { "title": "short finding", "severity": "low|medium|high|positive", "description": "what you observed for this lens", "recommendation": "concrete fix (omit for positive findings)" }
  ],
  "friction_points": [
    { "screen_sequence": number, "description": "...", "severity": "low|medium|high", "reason": "..." }
  ],
  "confidence_level": float,
  "persona_reaction": "first-person reaction from the persona for this lens"
}`;
}
