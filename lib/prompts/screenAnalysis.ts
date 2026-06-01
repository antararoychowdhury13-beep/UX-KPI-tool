// Prompt 1 — Screenshot Analysis (Gemini Vision). Spec §5.

export function screenAnalysisPrompt(params: {
  flowDescription: string;
  flowType: string;
  beforeCount: number;
  afterCount: number;
}): string {
  return `You are a senior UX analyst. You will be given sequential screenshots of a user interface.
BEFORE screenshots: ${params.beforeCount} image(s), in sequence.
AFTER screenshots: ${params.afterCount} image(s), in sequence.
User's description of this flow: ${params.flowDescription}
Flow type: ${params.flowType}

Analyze and return JSON only:
{
  "before_flow_summary": "...",
  "after_flow_summary": "...",
  "total_steps_before": number,
  "total_steps_after": number,
  "key_changes": [
    {
      "screen_sequence": number,
      "change_type": "removed_step | simplified | reorganized | new_feature | error_handling",
      "description": "...",
      "ux_impact": "..."
    }
  ],
  "friction_points_removed": ["..."],
  "new_capabilities_added": ["..."]
}`;
}
