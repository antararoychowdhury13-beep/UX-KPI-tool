// Prompt 3b — Task Scenario Testing (Claude). Spec v2 §6. Testing method: task_scenario.

export function taskScenarioTestingPrompt(params: {
  personaJson: string;
  flowType: "before" | "after";
  flowDescription: string;
  keyChanges: string;
}): string {
  return `You are a usability testing expert running task-based evaluation.
Simulate this persona attempting 5 key tasks in this flow.
Persona: ${params.personaJson}
Flow variant: ${params.flowType} (before | after)
Flow description: ${params.flowDescription}
Key UI changes: ${params.keyChanges}

Generate 5 realistic tasks a user of this type would need to complete, simulate each, and return results.
Return JSON only:
{
  "task_success_rate": float (0-1),
  "estimated_time_to_task": "...",
  "error_likelihood": "low|medium|high",
  "overall_score": float (0-10),
  "task_scenarios_result": [
    {
      "task_name": "...",
      "task_description": "...",
      "success": boolean,
      "steps_taken": number,
      "expected_steps": number,
      "completion_time_estimate": "...",
      "deviation_reason": "...",
      "severity": "low|medium|high|na"
    }
  ],
  "friction_points": [
    { "screen_sequence": number, "description": "...", "severity": "low|medium|high", "reason": "..." }
  ],
  "confidence_level": float,
  "persona_reaction": "..."
}`;
}
